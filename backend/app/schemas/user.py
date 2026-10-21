from pydantic import BaseModel, ConfigDict, Field
from app.models import UserRole

class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole
    
class UserCreate(UserBase):
    hashed_password: str = Field(min_length=8)

class UserRead(UserBase):
    id:int

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(UserBase):
    "Same Fields"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
