import datetime
from pydantic import BaseModel, ConfigDict, Field, field_serializer
from app.models.order import OrderStatus
from app.schemas.menu import MenuItemOut


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = Field(default=1, ge=1, le=50)
    note: str | None = Field(default=None, max_length=200)


class OrderItemOut(BaseModel):
    id: int
    menu_item: MenuItemOut
    quantity: int
    unit_price: float
    note: str | None = None

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    table_id: int
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderOut(BaseModel):
    id: int
    table_id: int
    table_number: int | None = None
    status: OrderStatus
    created_at: datetime.datetime
    status_changed_at: datetime.datetime
    created_by_name: str | None = None
    items: list[OrderItemOut]
    total: float

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "status_changed_at")
    def _as_utc(self, value: datetime.datetime):
        # DB stores naive UTC; send it with an explicit Z so browsers compute ages correctly
        if value.tzinfo is None:
            value = value.replace(tzinfo=datetime.timezone.utc)
        return value.astimezone(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
