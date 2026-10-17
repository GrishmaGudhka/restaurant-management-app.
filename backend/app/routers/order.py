import datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem, OrderStatus, OPEN_STATUSES, utcnow
from app.models.table import Table, TableStatus
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.core.deps import get_current_user, require_role
from app.services.order_service import ALLOWED_TRANSITIONS, release_table_if_idle

router = APIRouter(prefix="/orders", tags=["Orders"])


def _order_query(db: Session):
    # eager-load everything the response needs (avoids one query per row)
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.menu_item),
        joinedload(Order.table),
        joinedload(Order.created_by),
    )


@router.get("/", response_model=list[OrderOut])
def list_orders(scope: Literal["active", "history"] | None = Query(None), db: Session = Depends(get_db),
                _user=Depends(get_current_user)):
    """active = open tickets, oldest first (like a rail). history = closed/cancelled in the last 24h."""
    q = _order_query(db)
    if scope == "active":
        return q.filter(Order.status.in_(OPEN_STATUSES)).order_by(Order.created_at.asc()).all()
    if scope == "history":
        since = utcnow() - datetime.timedelta(hours=24)
        return (q.filter(Order.status.in_([OrderStatus.closed, OrderStatus.cancelled]), Order.status_changed_at >= since)
                 .order_by(Order.status_changed_at.desc()).limit(50).all())
    return q.order_by(Order.created_at.desc()).all()


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(order: OrderCreate, db: Session = Depends(get_db),
                 user: User = Depends(require_role(UserRole.staff, UserRole.admin))):
    table = db.query(Table).filter(Table.id == order.table_id, Table.is_active.is_(True)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    lines = []
    for line in order.items:
        item = db.query(MenuItem).filter(MenuItem.id == line.menu_item_id, MenuItem.is_active.is_(True)).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Menu item {line.menu_item_id} not found")
        if not item.is_available:
            raise HTTPException(status_code=400, detail=f"'{item.name}' is sold out")
        lines.append((item, line))

    db_order = Order(table_id=table.id, status=OrderStatus.pending, created_by_id=user.id)
    db.add(db_order)
    db.flush()
    for item, line in lines:
        db.add(OrderItem(order_id=db_order.id, menu_item_id=item.id, quantity=line.quantity,
                         unit_price=item.price, note=(line.note or "").strip() or None))
    table.status = TableStatus.occupied
    db.commit()
    return _order_query(db).filter(Order.id == db_order.id).first()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    order = _order_query(db).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, update: OrderStatusUpdate, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed_roles = ALLOWED_TRANSITIONS.get((order.status, update.status))
    if allowed_roles is None:
        raise HTTPException(status_code=400, detail=f"A {order.status.value} ticket can't move to {update.status.value}")
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Your role isn't allowed to make this change")

    order.status = update.status
    order.status_changed_at = utcnow()
    db.flush()
    if update.status in (OrderStatus.closed, OrderStatus.cancelled):
        release_table_if_idle(db, order.table_id)
    db.commit()
    return _order_query(db).filter(Order.id == order_id).first()
