from sqlalchemy.orm import Session
from app.models.order import Order, OrderStatus, OPEN_STATUSES
from app.models.table import Table, TableStatus
from app.models.user import UserRole

A, S, K = UserRole.admin, UserRole.staff, UserRole.kitchen
P, PR, R, SV, C, X = (OrderStatus.pending, OrderStatus.preparing, OrderStatus.ready,
                      OrderStatus.served, OrderStatus.closed, OrderStatus.cancelled)

# (from_status, to_status) -> roles allowed to make that move.
# Mirrors a real restaurant: kitchen cooks, servers serve and take payment, admin can do anything.
ALLOWED_TRANSITIONS = {
    (P, PR): {K, A},
    (PR, R): {K, A},
    (R, SV): {S, A},
    (SV, C): {S, A},
    (P, X): {S, A},   # staff can cancel before the kitchen starts
    (PR, X): {A},     # once food is being made, only an admin can void
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
