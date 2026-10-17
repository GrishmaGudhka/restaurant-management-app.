from pydantic import BaseModel, ConfigDict, Field
from app.models.user import UserRole


class SetupAdmin(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=72)


class UserCreate(SetupAdmin):
    role: UserRole = UserRole.staff


class UserUpdate(BaseModel):
    is_active: bool


class UserOut(BaseModel):
    id: int
    username: str
    role: UserRole
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    username: str


class SetupStatus(BaseModel):
    needs_setup: bool
