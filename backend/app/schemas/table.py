from pydantic import BaseModel

from app.models.table import TableStatus


class TableBase(BaseModel):
    number: int
    capacity: int
    status: TableStatus = TableStatus.free


class TableCreate(TableBase):
    pass


class TableUpdateStatus(BaseModel):
    status: TableStatus


class TableOut(TableBase):
    id: int

    class Config:
        from_attributes = True
