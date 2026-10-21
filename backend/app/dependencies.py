from collections.abc import AsyncGenerator
import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import User, UserRole
from app.security import decode_access_token

# Used to get user from JWT Token which is in the Authorix=zation header of the request 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl= "auth/token")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
        token:str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
) -> User:
    cred_exception = HTTPException(
        status_code= status.HTTP_401_UNAUTHORIZED,
        detail= "Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if username is None:
            raise cred_exception
    except jwt.InvalidTokenError:
        raise cred_exception

    res = await db.execute(select(User).where(User.username == username))
    user = res.scalar_one_or_none()
    if user is None:
        raise cred_exception

    return user

def require_role(*allowed_role: UserRole):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_role:
            raise HTTPException(
                status_code= status.HTTP_403_FORBIDDEN,
                detail= (f"Role '{current_user.role.value}' is not permitted to preform this action"),
            )
        return current_user
    return role_checker
        
    