from sqlalchemy.orm import Session, joinedload
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem, OrderStatus, OPEN_STATUSES
from app.models.table import Table, TableStatus
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate

A, S, K = UserRole.admin, UserRole.staff, UserRole.kitchen
P, PR, R, SV, C, X = (
    OrderStatus.pending,
    OrderStatus.preparing,
    OrderStatus.ready,
    OrderStatus.served,
    OrderStatus.closed,
    OrderStatus.cancelled,
)

# (from_status, to_status) -> roles allowed to make that move.
ALLOWED_TRANSITIONS = {
    (P, PR): {K, S, A},  # Kitchen, Staff, Admin can start preparing
    (PR, R): {K, S, A},  # Kitchen, Staff, Admin can mark ready
    (R, SV): {S, A},     # Staff, Admin can mark served
    (SV, C): {S, A},     # Staff, Admin can close order / process payment
    (P, X): {S, A},      # Staff, Admin can cancel before kitchen starts
    (PR, X): {A},        # Once food is being made, only Admin can void
    (R, X): {A},
    (SV, X): {A},
}


def open_orders_count(db: Session, table_id: int) -> int:
    return db.query(Order).filter(Order.table_id == table_id, Order.status.in_(OPEN_STATUSES)).count()


def release_table_if_idle(db: Session, table_id: int) -> None:
    """Free the table when its last open ticket is closed/cancelled."""
    if open_orders_count(db, table_id) == 0:
        table = db.query(Table).filter(Table.id == table_id).first()
        if table:
            table.status = TableStatus.free


def calculate_order_financials(order: Order) -> Order:
    """Computes subtotal, tax, service charge, discount, and total for an order ticket."""
    subtotal = sum((item.unit_price * item.quantity) for item in getattr(order, 'items', []))
    discount = getattr(order, 'discount_amount', 0.0) or 0.0
    tax_rate = getattr(order, 'tax_rate', 5.0) if getattr(order, 'tax_rate', None) is not None else 5.0
    service_charge_rate = getattr(order, 'service_charge_rate', 0.0) or 0.0

    taxable = max(0.0, subtotal - discount)
    tax_amount = round(taxable * (tax_rate / 100.0), 2)
    service_charge_amount = round(taxable * (service_charge_rate / 100.0), 2)
    total = round(taxable + tax_amount + service_charge_amount, 2)

    # Attach properties dynamically for OrderOut Pydantic serialization
    order.subtotal = subtotal
    order.tax_rate = tax_rate
    order.tax_amount = tax_amount
    order.service_charge_rate = service_charge_rate
    order.service_charge_amount = service_charge_amount
    order.discount_amount = discount
    order.total = total
    return order


def list_orders(db: Session, view: str = "active", table_id: int | None = None) -> list[Order]:
    query = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.menu_item),
        joinedload(Order.table),
        joinedload(Order.created_by)
    )

    if view == "active":
        query = query.filter(Order.status.in_(OPEN_STATUSES))
    elif view == "history":
        query = query.filter(Order.status.in_([OrderStatus.closed, OrderStatus.cancelled]))

    if table_id:
        query = query.filter(Order.table_id == table_id)

    orders = query.order_by(Order.created_at.desc()).all()
    for o in orders:
        if hasattr(o, 'table') and o.table:
            o.table_number = o.table.number
        if hasattr(o, 'created_by') and o.created_by:
            o.created_by_name = getattr(o.created_by, 'name', None) or o.created_by.username
        calculate_order_financials(o)

    return orders


def create_order(db: Session, order_in: OrderCreate, user_id: int) -> Order:
    table = db.query(Table).filter(Table.id == order_in.table_id).first()
    if not table:
        raise ValueError("Table not found")

    table.status = TableStatus.occupied

    db_order = Order(
        table_id=order_in.table_id,
        created_by_id=user_id,
        status=OrderStatus.pending,
    )

    # Apply tax, service charge, and discount fields if present on model
    if hasattr(db_order, 'tax_rate'):
        db_order.tax_rate = getattr(order_in, 'tax_rate', 5.0)
    if hasattr(db_order, 'service_charge_rate'):
        db_order.service_charge_rate = getattr(order_in, 'service_charge_rate', 0.0)
    if hasattr(db_order, 'discount_amount'):
        db_order.discount_amount = getattr(order_in, 'discount_amount', 0.0)

    db.add(db_order)
    db.flush()

    for item_in in order_in.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_in.menu_item_id).first()
        if not menu_item:
            raise ValueError(f"Menu item #{item_in.menu_item_id} not found")

        db_item = OrderItem(
            order_id=db_order.id,
            menu_item_id=menu_item.id,
            quantity=item_in.quantity,
            unit_price=menu_item.price,
            note=item_in.note,
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_order)

    if table:
        db_order.table_number = table.number

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db_order.created_by_name = getattr(user, 'name', None) or user.username

    calculate_order_financials(db_order)
    return db_order


def update_status(db: Session, order_id: int, new_status: OrderStatus, role: UserRole | None = None) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found")

    if role and (order.status, new_status) in ALLOWED_TRANSITIONS:
        allowed_roles = ALLOWED_TRANSITIONS[(order.status, new_status)]
        if role not in allowed_roles:
            raise ValueError(
                f"Role '{role.value}' is not allowed to transition status from '{order.status.value}' to '{new_status.value}'"
            )

    order.status = new_status
    db.commit()
    db.refresh(order)

    if new_status in (OrderStatus.closed, OrderStatus.cancelled):
        release_table_if_idle(db, order.table_id)

    if hasattr(order, 'table') and order.table:
        order.table_number = order.table.number
    if hasattr(order, 'created_by') and order.created_by:
        order.created_by_name = getattr(order.created_by, 'name', None) or order.created_by.username

    calculate_order_financials(order)
    return order


def cancel_order(db: Session, order_id: int, role: UserRole | None = None) -> Order:
    return update_status(db, order_id=order_id, new_status=OrderStatus.cancelled, role=role)