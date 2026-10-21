from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Engineer, User, UserRole
from app.schemas.engineer import EngineerCreate, EngineerRead, EngineerUpdate

router = APIRouter(prefix="/engineers", tags=["engineers"])

@router.get("", response_model=list[EngineerRead], status_code= status.HTTP_200_OK)
async def get_list_engineers(db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[Engineer]:
    
    statement = select(Engineer)
    statement = statement.where(Engineer.is_active == True).order_by(Engineer.id)

    res = await db.execute(statement)
    return list(res.scalars().all())

@router.get("/{eid}", response_model=EngineerRead, status_code= status.HTTP_200_OK)
async def get_engineer(eid:int, db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> Engineer:
    engineer = await db.get(Engineer, eid) 

    if engineer == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Engineer {eid} is not found"
                )
    return engineer

@router.post("", response_model=EngineerCreate, status_code= status.HTTP_201_CREATED)
async def create_engineer(payload: EngineerCreate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Engineer:
    
    engineer = Engineer(**payload.model_dump())
    db.add(engineer)
    await db.commit()
    await db.refresh(engineer)

    return engineer

@router.put("/{eid}", response_model=EngineerUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_engineer(eid:int, payload: EngineerUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Engineer:
    
    engineer = await db.get(Engineer, eid)

    engineer.user_id = payload.user_id
    engineer.max_workload = payload.max_workload
    engineer.building_id = payload.building_id

    db.add(engineer)
    await db.commit()
    await db.refresh(engineer)
    return engineer

@router.put("/deactive/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def deactive_engineer(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    engineer = await db.get(Engineer, eid)
    engineer.is_active = False
    db.add(engineer)
    await db.commit()
    await db.refresh(engineer)
    return engineer

@router.put("/active/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def active_engineer(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    engineer = await db.get(Engineer, eid)
    engineer.is_active = True
    db.add(engineer)
    await db.commit()
    await db.refresh(engineer)
    return engineer

@router.delete("/{eid}", status_code= status.HTTP_204_NO_CONTENT)
async def delete_engineer(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    engineer = await db.get(Engineer, eid)
    await db.delete(engineer)
    await db.commit()

    return Response(status_code=204)
