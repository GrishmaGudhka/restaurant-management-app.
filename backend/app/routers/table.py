from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.table import Table
from app.models.user import UserRole
from app.schemas.table import TableCreate, TableOut, TableUpdateStatus
from app.core.deps import require_role

router = APIRouter(prefix="/tables", tags=["Tables"])


@router.get("/", response_model=list[TableOut])
def list_tables(db: Session = Depends(get_db)):
    return db.query(Table).all()


@router.post("/", response_model=TableOut, status_code=201)
def create_table(
    table: TableCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(UserRole.admin)),
):
    existing = db.query(Table).filter(Table.number == table.number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Table {table.number} already exists")
    db_table = Table(**table.model_dump())
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table


@router.get("/{table_id}", response_model=TableOut)
def get_table(table_id: int, db: Session = Depends(get_db)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


@router.patch("/{table_id}/status", response_model=TableOut)
def update_table_status(table_id: int, update: TableUpdateStatus, db: Session = Depends(get_db)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.status = update.status
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
