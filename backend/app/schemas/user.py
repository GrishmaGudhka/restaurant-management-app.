from pydantic import BaseModel

from app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.staff


class UserOut(BaseModel):
    id: int
    username: str
    role: UserRole

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None
