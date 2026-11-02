from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.database import get_db
from app.models.table import Table, TableStatus
from app.models.user import UserRole
from app.schemas.table import TableCreate, TableOut, TableStatusUpdate

router = APIRouter(prefix="/tables", tags=["Tables"])


@router.get("/", response_model=list[TableOut])
def list_tables(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return db.query(Table).order_by(Table.number).all()


@router.post("/", response_model=TableOut, status_code=201)
def create_table(
    table_in: TableCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(UserRole.admin)),
):
    existing = db.query(Table).filter(Table.number == table_in.number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Table number {table_in.number} already exists")

    table = Table(number=table_in.number, capacity=table_in.capacity, status=TableStatus.free)
    db.add(table)
    db.commit()
    db.refresh(table)
    return table


@router.patch("/{table_id}/status", response_model=TableOut)
def update_table_status(
    table_id: int,
    data: TableStatusUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_role(UserRole.admin, UserRole.staff, UserRole.kitchen)),
):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    table.status = data.status
    db.commit()
    db.refresh(table)
    return table


@router.delete("/{table_id}", status_code=204)
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(UserRole.admin)),
):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    db.delete(table)
    db.commit()