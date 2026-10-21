from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Floor, User, UserRole
from app.schemas.floor import FloorCreate, FloorRead, FloorUpdate

router = APIRouter(prefix="/floors", tags=["floors"])

@router.get("", response_model=list[FloorRead], status_code= status.HTTP_200_OK)
async def get_list_floors(db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[Floor]:
    
    statement = select(Floor)
    statement = statement.where(Floor.is_active == True).order_by(Floor.id)

    res = await db.execute(statement)
    return list(res.scalars().all())

@router.get("/{eid}", response_model=FloorRead, status_code= status.HTTP_200_OK)
async def get_floor(eid:int, db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> Floor:
    floor = await db.get(Floor, eid) 

    if floor == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Floor {eid} is not found"
                )
    return floor

@router.post("", response_model=FloorCreate, status_code= status.HTTP_201_CREATED)
async def create_floor(payload: FloorCreate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Floor:
    
    floor = Floor(**payload.model_dump())
    db.add(floor)
    await db.commit()
    await db.refresh(floor)

    return floor

@router.put("/{eid}", response_model=FloorUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_floor(eid:int, payload: FloorUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Floor:
    
    floor = await db.get(Floor, eid)

    floor.building_id = payload.building_id
    floor.floor_number = payload.floor_number
    floor.capacity = payload.capacity

    db.add(floor)
    await db.commit()
    await db.refresh(floor)
    return floor

@router.put("/deactive/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def deactive_floor(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    floor = await db.get(Floor, eid)
    floor.is_active = False
    db.add(floor)
    await db.commit()
    await db.refresh(floor)
    return floor

@router.put("/active/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def active_floor(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    floor = await db.get(Floor, eid)
    floor.is_active = True
    db.add(floor)
    await db.commit()
    await db.refresh(floor)
    return floor

@router.delete("/{eid}", status_code= status.HTTP_204_NO_CONTENT)
async def delete_floor(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    floor = await db.get(Floor, eid)
    await db.delete(floor)
    await db.commit()

    return Response(status_code=204)
