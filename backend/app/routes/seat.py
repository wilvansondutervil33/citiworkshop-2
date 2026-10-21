from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Seat, User, UserRole
from app.schemas.seat import SeatCreate, SeatRead, SeatUpdate

router = APIRouter(prefix="/seats", tags=["seats"])

@router.get("", response_model=list[SeatRead], status_code= status.HTTP_200_OK)
async def get_list_seats(db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[Seat]:
    
    statement = select(Seat)
    statement = statement.where(Seat.is_active == True).order_by(Seat.id)

    res = await db.execute(statement)
    return list(res.scalars().all())

@router.get("/{eid}", response_model=SeatRead, status_code= status.HTTP_200_OK)
async def get_seat(eid:int, db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> Seat:
    seat = await db.get(Seat, eid) 

    if seat == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Seat {eid} is not found"
                )
    return seat

@router.post("", response_model=SeatCreate, status_code= status.HTTP_201_CREATED)
async def create_seat(payload: SeatCreate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Seat:
    
    seat = Seat(**payload.model_dump())
    db.add(seat)
    await db.commit()
    await db.refresh(seat)

    return seat

@router.put("/{eid}", response_model=SeatUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_seat(eid:int, payload: SeatUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Seat:
    
    seat = await db.get(Seat, eid)

    seat.floor_id = payload.floor_id
    seat.seat_type = payload.seat_type

    db.add(seat)
    await db.commit()
    await db.refresh(seat)
    return seat

@router.put("/deactive/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def deactive_seat(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    seat = await db.get(Seat, eid)
    seat.is_active = False
    db.add(seat)
    await db.commit()
    await db.refresh(seat)
    return seat

@router.put("/active/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def active_seat(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    seat = await db.get(Seat, eid)
    seat.is_active = True
    db.add(seat)
    await db.commit()
    await db.refresh(seat)
    return seat

@router.delete("/{eid}", status_code= status.HTTP_204_NO_CONTENT)
async def delete_seat(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    seat = await db.get(Seat, eid)
    await db.delete(seat)
    await db.commit()

    return Response(status_code=204)
