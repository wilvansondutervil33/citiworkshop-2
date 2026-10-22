from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_role
from app.models import User, UserRole
from app.schemas.user import Token, UserCreate, UserRead, UserSignup
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    res = await db.execute(select(User).where(User.email == form_data.username))
    user = res.scalar_one_or_none()

    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code= status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers= {"WWW-Authenicate": "Bearer"}
        )
    if not user.is_active:
        raise HTTPException(
            status_code= status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact a facility admin.",
        )

    access_token = create_access_token(data = {'sub': user.email, "role": user.role.value})
    return Token(access_token=access_token, token_type="bearer")

async def create_user(db: AsyncSession, email: str, name: str, password: str, role: UserRole) -> User:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code= status.HTTP_400_BAD_REQUEST,
            detail= f"Email '{email}' is already taken",
        )

    user = User(email = email, name = name, hashed_password = hash_password(password), role = role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/register", response_model= UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.FACILITY_ADMIN)),
) -> User:
    return await create_user(db, payload.email, payload.name, payload.hashed_password, payload.role)

@router.post("/signup", response_model= UserRead, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup, db: AsyncSession = Depends(get_db)) -> User:
    """Public: employees create their own account. Admins and engineers are added by a facility admin."""
    return await create_user(db, payload.email, payload.name, payload.password, UserRole.EMPLOYEE)
