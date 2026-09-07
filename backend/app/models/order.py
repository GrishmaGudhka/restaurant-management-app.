import enum
import datetime

from sqlalchemy import Column, Integer, Float, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


class OrderStatus(str, enum.Enum):
    pending = "pending"      # just created, not yet sent to kitchen
    preparing = "preparing"  # kitchen is working on it
    ready = "ready"          # kitchen finished, waiting to be served
    served = "served"        # delivered to the table
    closed = "closed"        # bill paid, order complete


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    table = relationship("Table")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    @property
    def total(self) -> float:
        return sum(item.quantity * item.unit_price for item in self.items)


class OrderItem(Base):
    """One line in an order — a menu item + quantity, with price snapshotted
    at order time (so later menu price changes don't rewrite old orders)."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)  # snapshot of MenuItem.price at order time

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")
