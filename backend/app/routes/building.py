from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Building, User, UserRole
from app.schemas.building import BuildingCreate, BuildingRead, BuildingUpdate

router = APIRouter(prefix="/buildings", tags=["buildings"])

@router.get("", response_model=list[BuildingRead], status_code= status.HTTP_200_OK)
async def get_list_buildings(db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[Building]:
    
    statement = select(Building)
    statement = statement.where(Building.is_active == True).order_by(Building.id)

    res = await db.execute(statement)
    return list(res.scalars().all())

@router.get("/{eid}", response_model=BuildingRead, status_code= status.HTTP_200_OK)
async def get_building(eid:int, db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> Building:
    building = await db.get(Building, eid) 

    if building == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Building {eid} is not found"
                )
    return building

@router.post("", response_model=BuildingCreate, status_code= status.HTTP_201_CREATED)
async def create_building(payload: BuildingCreate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Building:
    
    building = Building(**payload.model_dump())
    db.add(building)
    await db.commit()
    await db.refresh(building)

    return building

@router.put("/{eid}", response_model=BuildingUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_building(eid:int, payload: BuildingUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Building:
    
    building = await db.get(Building, eid)

    building.name = payload.name
    building.address = payload.address

    db.add(building)
    await db.commit()
    await db.refresh(building)
    return building

@router.put("/deactive/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def deactive_building(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    building = await db.get(Building, eid)
    building.is_active = False
    db.add(building)
    await db.commit()
    await db.refresh(building)
    return building

@router.put("/active/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def active_building(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    building = await db.get(Building, eid)
    building.is_active = True
    db.add(building)
    await db.commit()
    await db.refresh(building)
    return building

@router.delete("/{eid}", status_code= status.HTTP_204_NO_CONTENT)
async def delete_building(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    building = await db.get(Building, eid)
    await db.delete(building)
    await db.commit()

    return Response(status_code=204)
