from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.menu import MenuItem
from app.models.table import Table, TableStatus
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["Orders"])


def _order_query(db: Session):
    # eager-load items + their menu item + table so the response doesn't trigger
    # a separate query per row (avoids the classic N+1 problem)
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.menu_item),
        joinedload(Order.table),
    )


@router.get("/", response_model=list[OrderOut])
def list_orders(status: OrderStatus | None = Query(None), db: Session = Depends(get_db)):
    q = _order_query(db)
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.created_at.desc()).all()


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    table = db.query(Table).filter(Table.id == order.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if not order.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    db_order = Order(table_id=order.table_id, status=OrderStatus.pending)
    db.add(db_order)
    db.flush()  # gets db_order.id without a full commit yet

    for line in order.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == line.menu_item_id).first()
        if not menu_item:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Menu item {line.menu_item_id} not found")
        if not menu_item.is_available:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"'{menu_item.name}' is not available")
        db.add(OrderItem(
            order_id=db_order.id,
            menu_item_id=menu_item.id,
            quantity=line.quantity,
            unit_price=menu_item.price,  # snapshot price now
        ))

    # opening an order occupies the table
    table.status = TableStatus.occupied

    db.commit()
    db.refresh(db_order)
    return _order_query(db).filter(Order.id == db_order.id).first()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = _order_query(db).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, update: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = update.status

    # closing an order frees up the table again
    if update.status == OrderStatus.closed:
        table = db.query(Table).filter(Table.id == order.table_id).first()
        if table:
            table.status = TableStatus.free

    db.commit()
    return _order_query(db).filter(Order.id == order_id).first()
