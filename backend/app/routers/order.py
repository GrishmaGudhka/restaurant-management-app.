import datetime
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from jose import jwt, JWTError

from app.config import settings
from app.core.events import broadcaster
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
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.menu_item),
        joinedload(Order.table),
        joinedload(Order.created_by),
    )


def get_sse_user(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    raw_token = token
    if not raw_token and authorization:
        if authorization.startswith("Bearer "):
            raw_token = authorization.split(" ")[1]
        else:
            raw_token = authorization

    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token missing")

    try:
        payload = jwt.decode(raw_token, settings.secret_key, algorithms=[settings.algorithm])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or missing")
    return user


@router.get("/stream")
async def stream_orders(_user: User = Depends(get_sse_user)):
    return StreamingResponse(
        broadcaster.subscribe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/", response_model=list[OrderOut])
def list_orders(
    scope: Literal["active", "history"] | None = Query(None),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    q = _order_query(db)
    if scope == "active":
        return q.filter(Order.status.in_(OPEN_STATUSES)).order_by(Order.created_at.asc()).all()
    if scope == "history":
        since = utcnow() - datetime.timedelta(hours=24)
        return (
            q.filter(Order.status.in_([OrderStatus.closed, OrderStatus.cancelled]), Order.status_changed_at >= since)
            .order_by(Order.status_changed_at.desc())
            .limit(50)
            .all()
        )
    return q.order_by(Order.created_at.desc()).all()


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.staff, UserRole.admin, UserRole.kitchen)),
):
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

    existing_order = (
        db.query(Order)
        .filter(Order.table_id == table.id, Order.status.in_(OPEN_STATUSES))
        .order_by(Order.created_at.asc())
        .first()
    )

    if existing_order:
        target_order = existing_order
        # Safe round computation ignoring None values
        valid_rounds = [item.round for item in target_order.items if item.round is not None]
        next_round = max(valid_rounds, default=1) + 1 if valid_rounds else 1
        
        target_order.status = OrderStatus.pending  # Return to kitchen rail for new round
        target_order.status_changed_at = utcnow()
    else:
        target_order = Order(table_id=table.id, status=OrderStatus.pending, created_by_id=user.id)
        db.add(target_order)
        db.flush()
        next_round = 1

    for item, line in lines:
        db.add(
            OrderItem(
                order_id=target_order.id,
                menu_item_id=item.id,
                quantity=line.quantity,
                unit_price=item.price,
                note=(line.note or "").strip() or None,
                round=next_round,
            )
        )

    table.status = TableStatus.occupied
    db.commit()
    broadcaster.notify("order_created")
    return _order_query(db).filter(Order.id == target_order.id).first()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    order = _order_query(db).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
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
    broadcaster.notify("status_updated")
    return _order_query(db).filter(Order.id == order_id).first()