import enum
from sqlalchemy import Column, Integer, Enum, Boolean
from app.database import Base


class TableStatus(str, enum.Enum):
    free = "free"
    occupied = "occupied"
    reserved = "reserved"


class Table(Base):
    __tablename__ = "tables"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, nullable=False)  # unique among *active* tables, enforced in the router
    capacity = Column(Integer, nullable=False)
    status = Column(Enum(TableStatus), default=TableStatus.free, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # False = removed from the floor (kept for old orders)
