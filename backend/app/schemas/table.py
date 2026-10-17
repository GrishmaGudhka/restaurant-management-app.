from pydantic import BaseModel, ConfigDict, Field
from app.models.table import TableStatus


class TableCreate(BaseModel):
    number: int = Field(ge=1, le=999)
    capacity: int = Field(ge=1, le=50)


class TableUpdateStatus(BaseModel):
    status: TableStatus


class TableOut(BaseModel):
    id: int
    number: int
    capacity: int
    status: TableStatus

    model_config = ConfigDict(from_attributes=True)
