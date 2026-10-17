from pydantic import BaseModel, ConfigDict, Field


class MenuItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: str | None = Field(default=None, max_length=40)
    price: float = Field(ge=0)
    is_available: bool = True


class MenuItemCreate(MenuItemBase):
    pass


class AvailabilityUpdate(BaseModel):
    is_available: bool


class MenuItemOut(MenuItemBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
