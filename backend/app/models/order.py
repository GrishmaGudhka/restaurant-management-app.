import enum
import datetime
from sqlalchemy import Column, Integer, Float, String, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow() -> datetime.datetime:
    """Naive UTC timestamp (SQLite doesn't store timezones; the API adds the 'Z' back)."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class OrderStatus(str, enum.Enum):
    pending = "pending"      # new ticket, kitchen hasn't started
    preparing = "preparing"  # being cooked
    ready = "ready"          # on the pass, waiting for a server
    served = "served"        # at the table, waiting for the bill
    closed = "closed"        # bill paid
    cancelled = "cancelled"  # voided


OPEN_STATUSES = (OrderStatus.pending, OrderStatus.preparing, OrderStatus.ready, OrderStatus.served)


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    status_changed_at = Column(DateTime, default=utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    table = relationship("Table")
    created_by = relationship("User")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    @property
    def table_number(self):
        return self.table.number if self.table else None

    @property
    def created_by_name(self):
        return self.created_by.username if self.created_by else None

    @property
    def total(self) -> float:
        return sum(item.quantity * item.unit_price for item in self.items)


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)  # price snapshot at order time
    note = Column(String, nullable=True)        # e.g. "no onion", "allergy: peanuts"

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")
