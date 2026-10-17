from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import SetupAdmin, SetupStatus, UserCreate, UserOut, UserUpdate, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["Auth"])


def _token_for(user: User) -> Token:
    token = create_access_token({"sub": user.username, "role": user.role.value})
    return Token(access_token=token, role=user.role, username=user.username)


@router.get("/setup-status", response_model=SetupStatus)
def setup_status(db: Session = Depends(get_db)):
    """Public: lets the login screen know whether the first admin still needs to be created."""
    return SetupStatus(needs_setup=db.query(User).count() == 0)


@router.post("/setup", response_model=Token, status_code=201)
def setup_first_admin(data: SetupAdmin, db: Session = Depends(get_db)):
    """Public, but only works while there are zero users. After that, admins create accounts."""
    if db.query(User).count() > 0:
        raise HTTPException(status_code=403, detail="Setup is already complete")
    user = User(username=data.username, hashed_password=hash_password(data.password), role=UserRole.admin)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    return _token_for(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _admin=Depends(require_role(UserRole.admin))):
    return db.query(User).order_by(User.id).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), _admin=Depends(require_role(UserRole.admin))):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=data.username, hashed_password=hash_password(data.password), role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_role(UserRole.admin))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and not data.is_active:
        raise HTTPException(status_code=400, detail="You can't deactivate your own account")
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user
