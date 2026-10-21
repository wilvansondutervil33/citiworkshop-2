from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Floor, Seat, User, UserRole
from app.schemas.seat import SeatCreate, SeatRead, SeatUpdate

router = APIRouter(prefix="/seats", tags=["seats"])

async def ensure_floor_has_room(db: AsyncSession, floor_id: int) -> None:
    """Reject adding or reactivating a seat on a missing, deactivated or full floor."""
    floor = await db.get(Floor, floor_id)
    if floor is None or not floor.is_active:
        raise HTTPException(
                    status_code= status.HTTP_400_BAD_REQUEST,
                    detail= f"Floor {floor_id} doesn't exist or is deactivated"
                )
    res = await db.execute(select(func.count(Seat.id)).where(Seat.floor_id == floor_id, Seat.is_active == True))
    seat_count = res.scalar_one()
    if seat_count >= floor.capacity:
        raise HTTPException(
                    status_code= status.HTTP_400_BAD_REQUEST,
                    detail= f"Floor {floor.floor_number} is at capacity ({seat_count} of {floor.capacity} seats)"
                )

@router.get("", response_model=list[SeatRead], status_code= status.HTTP_200_OK)
async def get_list_seats(include_inactive: bool = Query(False), db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[Seat]:
    
    statement = select(Seat)
    if not include_inactive:
        statement = statement.where(Seat.is_active == True)
    statement = statement.order_by(Seat.id)

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

@router.post("", response_model=SeatRead, status_code= status.HTTP_201_CREATED)
async def create_seat(payload: SeatCreate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Seat:
    
    await ensure_floor_has_room(db, payload.floor_id)
    seat = Seat(**payload.model_dump())
    db.add(seat)
    await db.commit()
    await db.refresh(seat)

    return seat

@router.put("/{eid}", response_model=SeatUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_seat(eid:int, payload: SeatUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Seat:
    
    seat = await db.get(Seat, eid)
    if seat == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Seat {eid} is not found"
                )
    if seat.is_active and payload.floor_id != seat.floor_id:
        await ensure_floor_has_room(db, payload.floor_id)

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
    if seat == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Seat {eid} is not found"
                )
    if not seat.is_active:
        await ensure_floor_has_room(db, seat.floor_id)
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
