import enum

from sqlalchemy import Column, Integer, Enum

from app.database import Base


class TableStatus(str, enum.Enum):
    free = "free"
    occupied = "occupied"
    reserved = "reserved"


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    status = Column(Enum(TableStatus), default=TableStatus.free, nullable=False)
