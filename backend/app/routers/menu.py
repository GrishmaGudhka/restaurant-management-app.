from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.menu import MenuItem
from app.models.user import UserRole
from app.schemas.menu import MenuItemCreate, MenuItemOut, AvailabilityUpdate
from app.core.deps import get_current_user, require_role

router = APIRouter(prefix="/menu", tags=["Menu"])


def _get_item(db: Session, item_id: int) -> MenuItem:
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.is_active.is_(True)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.get("/", response_model=list[MenuItemOut])
def list_menu_items(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return db.query(MenuItem).filter(MenuItem.is_active.is_(True)).order_by(MenuItem.id).all()


@router.post("/", response_model=MenuItemOut, status_code=201)
def create_menu_item(item: MenuItemCreate, db: Session = Depends(get_db), _admin=Depends(require_role(UserRole.admin))):
    db_item = MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/{item_id}", response_model=MenuItemOut)
def update_menu_item(item_id: int, updated: MenuItemCreate, db: Session = Depends(get_db), _admin=Depends(require_role(UserRole.admin))):
    item = _get_item(db, item_id)
    for key, value in updated.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}/availability", response_model=MenuItemOut)
def set_availability(item_id: int, data: AvailabilityUpdate, db: Session = Depends(get_db),
                     _user=Depends(require_role(UserRole.admin, UserRole.kitchen))):
    """Kitchen marks a dish sold out when they run out; admin can too."""
    item = _get_item(db, item_id)
    item.is_available = data.is_available
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_menu_item(item_id: int, db: Session = Depends(get_db), _admin=Depends(require_role(UserRole.admin))):
    # Soft delete: old orders still point at this item, so we hide it instead of erasing it.
    item = _get_item(db, item_id)
    item.is_active = False
    item.is_available = False
    db.commit()
