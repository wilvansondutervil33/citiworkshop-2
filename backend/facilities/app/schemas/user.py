from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models import UserRole

# Matches the users table check constraints: lowercase @acme.inc addresses only
def normalize_acme_email(value: str) -> str:
    value = value.strip().lower()
    if not value.endswith("@acme.inc") or value == "@acme.inc":
        raise ValueError("Email must be an @acme.inc address")
    return value

# Trims the name and collapses inner runs of spaces; a name of only spaces is rejected
def clean_name(value: str) -> str:
    value = " ".join(value.split())
    if len(value) < 2:
        raise ValueError("Name must have at least 2 characters that aren't spaces")
    if len(value) > 25:
        raise ValueError("Name must be at most 25 characters")
    return value

# Passwords mix letters, numbers and special characters, with no spaces (length is checked by Field)
def check_password(value: str) -> str:
    if any(char.isspace() for char in value):
        raise ValueError("Password can't contain spaces")
    missing = []
    if not any(char.isalpha() for char in value):
        missing.append("a letter")
    if not any(char.isdigit() for char in value):
        missing.append("a number")
    if not any(not char.isalnum() for char in value):
        missing.append("a special character")
    if missing:
        raise ValueError(f"Password needs {', '.join(missing[:-1]) + ' and ' + missing[-1] if len(missing) > 1 else missing[0]}")
    return value

class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole
    
class UserCreate(UserBase):
    name: str
    hashed_password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def acme_email(cls, value: str) -> str:
        return normalize_acme_email(value)

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("hashed_password")
    @classmethod
    def valid_password(cls, value: str) -> str:
        return check_password(value)

class UserSignup(BaseModel):
    """Self-service sign-up from the login page; always creates an Employee."""
    name: str
    email: str
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def acme_email(cls, value: str) -> str:
        return normalize_acme_email(value)

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("password")
    @classmethod
    def valid_password(cls, value: str) -> str:
        return check_password(value)

class UserRead(UserBase):
    id:int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(UserBase):
    "Same Fields"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
