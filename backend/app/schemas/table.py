from pydantic import BaseModel, ConfigDict
from app.models.table import TableStatus


class TableCreate(BaseModel):
    number: int
    capacity: int = 4


class TableStatusUpdate(BaseModel):
    status: TableStatus


class TableOut(BaseModel):
    id: int
    number: int
    capacity: int
    status: TableStatus

    model_config = ConfigDict(from_attributes=True)