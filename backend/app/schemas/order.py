import datetime

from pydantic import BaseModel

from app.models.order import OrderStatus
from app.schemas.menu import MenuItemOut


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1


class OrderItemOut(BaseModel):
    id: int
    menu_item: MenuItemOut
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    table_id: int
    items: list[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderOut(BaseModel):
    id: int
    table_id: int
    status: OrderStatus
    created_at: datetime.datetime
    items: list[OrderItemOut]
    total: float

    class Config:
        from_attributes = True
