from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.menu import MenuItem
from app.models.user import UserRole
from app.schemas.menu import MenuItemCreate, MenuItemOut
from app.core.deps import require_role

router = APIRouter(prefix="/menu", tags=["Menu"])


@router.get("/", response_model=list[MenuItemOut])
def list_menu_items(db: Session = Depends(get_db)):
    return db.query(MenuItem).all()


@router.post("/", response_model=MenuItemOut, status_code=201)
def create_menu_item(
    item: MenuItemCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(UserRole.admin)),
):
    db_item = MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.get("/{item_id}", response_model=MenuItemOut)
def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.put("/{item_id}", response_model=MenuItemOut)
def update_menu_item(
    item_id: int,
    updated: MenuItemCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(UserRole.admin)),
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    for key, value in updated.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(UserRole.admin)),
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db.delete(item)
    db.commit()
