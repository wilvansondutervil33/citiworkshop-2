from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import User, UserRole
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=list[UserRead], status_code= status.HTTP_200_OK)
async def get_list_users(db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[User]:
    statment = select(User)
    res = await db.execute(statment)
    return list(res.scalars().all())

@router.get("/{uid}", response_model= UserRead, status_code= status.HTTP_200_OK)
async def get_user(uid:int, db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> User:
    user = await db.get(User, uid) 

    if user == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"User {uid} is not found"
                )
    return user

@router.put("/{uid}", response_model=UserUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_user(uid:int, payload: UserUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> User:
    
    user = await db.get(User, uid)

    user.email = payload.email
    user.name = payload.name
    user.role = payload.role

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/deactive/{uid}",  status_code= status.HTTP_202_ACCEPTED)
async def deactive_user(uid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    user = await db.get(User, uid)
    user.is_active = False
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/active/{uid}",  status_code= status.HTTP_202_ACCEPTED)
async def active_user(uid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    user = await db.get(User, uid)
    user.is_active = True
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{uid}", status_code= status.HTTP_204_NO_CONTENT)
async def delete_user(uid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    user = await db.get(User, uid)
    await db.delete(user)
    await db.commit()

    return Response(status_code=204)
