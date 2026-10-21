from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Ticket, User, UserRole
from app.schemas.ticket import TicketCreate, TicketRead, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("", response_model=list[TicketRead], status_code= status.HTTP_200_OK)
async def get_list_tickets(db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[Ticket]:
    
    statement = select(Ticket)
    statement = statement.order_by(Ticket.id)

    res = await db.execute(statement)
    return list(res.scalars().all())

@router.get("/{eid}", response_model=TicketRead, status_code= status.HTTP_200_OK)
async def get_ticket(eid:int, db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> Ticket:
    ticket = await db.get(Ticket, eid) 

    if ticket == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Ticket {eid} is not found"
                )
    return ticket

@router.post("", response_model=TicketCreate, status_code= status.HTTP_201_CREATED)
async def create_ticket(payload: TicketCreate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Ticket:
    
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return ticket

@router.put("/{eid}", response_model=TicketUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_ticket(eid:int, payload: TicketUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Ticket:
    
    ticket = await db.get(Ticket, eid)

    ticket.title = payload.title
    ticket.description = payload.description
    ticket.status = payload.status
    ticket.priority = payload.priority
    ticket.assigned_to_id = payload.assigned_to_id
    ticket.created_by_id = payload.created_by_id
    ticket.location_id = payload.location_id

    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket

@router.put("/deactive/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def deactive_ticket(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    ticket = await db.get(Ticket, eid)
    ticket.is_active = False
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket

@router.put("/active/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def active_ticket(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    ticket = await db.get(Ticket, eid)
    ticket.is_active = True
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket

@router.delete("/{eid}", status_code= status.HTTP_204_NO_CONTENT)
async def delete_ticket(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    ticket = await db.get(Ticket, eid)
    await db.delete(ticket)
    await db.commit()

    return Response(status_code=204)
