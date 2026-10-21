from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models import UserRole

class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole
    
class UserCreate(UserBase):
    name: str = Field(min_length=2, max_length=25)
    hashed_password: str = Field(min_length=8)

    # Matches the users table check constraints: lowercase @acme.inc addresses only
    @field_validator("email")
    @classmethod
    def acme_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not value.endswith("@acme.inc") or value == "@acme.inc":
            raise ValueError("Email must be an @acme.inc address")
        return value

class UserRead(UserBase):
    id:int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(UserBase):
    "Same Fields"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
