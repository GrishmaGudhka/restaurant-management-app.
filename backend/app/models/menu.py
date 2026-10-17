from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)  # "sold out" toggle
    is_active = Column(Boolean, default=True, nullable=False)     # False = removed from the menu (kept for old orders)
