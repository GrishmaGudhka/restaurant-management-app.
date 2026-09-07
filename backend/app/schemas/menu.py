from pydantic import BaseModel


class MenuItemBase(BaseModel):
    name: str
    category: str | None = None
    price: float
    is_available: bool = True


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemOut(MenuItemBase):
    id: int

    class Config:
        from_attributes = True
