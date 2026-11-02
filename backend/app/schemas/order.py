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
    menu_item_id: int
    quantity: int
    unit_price: float
    note: str | None = None
    round: int = 1
    menu_item: MenuItemOut

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    table_id: int
    items: list[OrderItemCreate] = Field(min_length=1)
    tax_rate: float = Field(default=5.0, ge=0.0)  # Default 5% GST
    service_charge_rate: float = Field(default=0.0, ge=0.0)  # Optional service charge %
    discount_amount: float = Field(default=0.0, ge=0.0)  # Optional discount in ₹


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
    items: list[OrderItemOut] = []

    # Financial breakdown
    subtotal: float = 0.0
    tax_rate: float = 5.0
    tax_amount: float = 0.0
    service_charge_rate: float = 0.0
    service_charge_amount: float = 0.0
    discount_amount: float = 0.0
    total: float

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "status_changed_at")
    def _as_utc(self, value: datetime.datetime):
        if value is None:
            return None
        # DB stores naive UTC; append explicit Z zone so client calculations match
        if value.tzinfo is None: 
            value = value.replace(tzinfo=datetime.timezone.utc)
        return value.astimezone(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")