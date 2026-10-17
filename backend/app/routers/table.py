from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.table import Table, TableStatus
from app.models.user import UserRole
from app.schemas.table import TableCreate, TableOut, TableUpdateStatus
from app.core.deps import get_current_user, require_role
from app.services.order_service import open_orders_count

router = APIRouter(prefix="/tables", tags=["Tables"])


def _get_table(db: Session, table_id: int) -> Table:
    table = db.query(Table).filter(Table.id == table_id, Table.is_active.is_(True)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


@router.get("/", response_model=list[TableOut])
def list_tables(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return db.query(Table).filter(Table.is_active.is_(True)).order_by(Table.number).all()


@router.post("/", response_model=TableOut, status_code=201)
def create_table(table: TableCreate, db: Session = Depends(get_db), _admin=Depends(require_role(UserRole.admin))):
    if db.query(Table).filter(Table.number == table.number, Table.is_active.is_(True)).first():
        raise HTTPException(status_code=400, detail=f"Table {table.number} already exists")
    db_table = Table(number=table.number, capacity=table.capacity, status=TableStatus.free)
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table


@router.patch("/{table_id}/status", response_model=TableOut)
def update_table_status(table_id: int, update: TableUpdateStatus, db: Session = Depends(get_db),
                        _user=Depends(require_role(UserRole.admin, UserRole.staff))):
    table = _get_table(db, table_id)
    if update.status == TableStatus.free and open_orders_count(db, table.id) > 0:
        raise HTTPException(status_code=400, detail=f"Table {table.number} still has open tickets. Close or cancel them first.")
    table.status = update.status
    db.commit()
    db.refresh(table)
    return table


@router.delete("/{table_id}", status_code=204)
def delete_table(table_id: int, db: Session = Depends(get_db), _admin=Depends(require_role(UserRole.admin))):
    table = _get_table(db, table_id)
    if open_orders_count(db, table.id) > 0:
        raise HTTPException(status_code=400, detail=f"Table {table.number} still has open tickets. Close or cancel them first.")
    table.is_active = False  # soft delete keeps past orders intact
    db.commit()
