from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Building, Engineer, Floor, IssueType, Seat, Ticket, TicketStatus, User, UserRole
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

ACTIVE_STATUSES = (TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.BLOCKED)

async def building_for_seat(db: AsyncSession, seat_id: int) -> Building | None:
    res = await db.execute(
        select(Building)
        .join(Floor, Floor.building_id == Building.id)
        .join(Seat, Seat.floor_id == Floor.id)
        .where(Seat.id == seat_id)
    )
    return res.scalar_one_or_none()

def issue_type_for(building: Building | None) -> IssueType:
    """A new ticket's issue type is the department of the building it's reported in."""
    if building is None or building.department is None:
        return IssueType.OTHER
    return IssueType(building.department.value)

async def pick_engineer(db: AsyncSession, building: Building | None, issue_type: IssueType) -> int | None:
    """Least-busy engineer in the building, if the building's department matches the issue type.

    Returns None (leave unassigned) for Other issues, a department mismatch, or when every
    engineer in the building is at their max workload.
    """
    if issue_type == IssueType.OTHER:
        return None
    if building is None or building.department is None or building.department.value != issue_type.value:
        return None

    active_count = func.count(Ticket.id).filter(Ticket.status.in_(ACTIVE_STATUSES))
    res = await db.execute(
        select(Engineer.id, Engineer.max_workload, active_count.label("active"))
        .join(User, User.id == Engineer.user_id)
        .outerjoin(Ticket, Ticket.assigned_to_id == Engineer.id)
        .where(Engineer.building_id == building.id, Engineer.is_active == True, User.is_active == True)
        .group_by(Engineer.id, Engineer.max_workload)
        .order_by(active_count, Engineer.id)
    )
    for engineer_id, max_workload, active in res.all():
        if active < max_workload:
            return engineer_id
    return None

@router.post("", response_model=TicketRead, status_code= status.HTTP_201_CREATED)
async def create_ticket(payload: TicketCreate ,db: AsyncSession = Depends(get_db), current_user:User = Depends(get_current_user)) -> Ticket:

    ticket = Ticket(**payload.model_dump())
    # Only admins can report on someone else's behalf, pick the engineer, or set the status
    if current_user.role != UserRole.FACILITY_ADMIN:
        ticket.created_by_id = current_user.id
        ticket.assigned_to_id = None
        ticket.status = TicketStatus.OPEN
    seat = await db.get(Seat, ticket.location_id)
    floor = await db.get(Floor, seat.floor_id) if seat else None
    building = await building_for_seat(db, ticket.location_id)
    if not (seat and seat.is_active and floor and floor.is_active and building and building.is_active):
        raise HTTPException(
                    status_code= status.HTTP_400_BAD_REQUEST,
                    detail= "That seat doesn't exist or has been deactivated. Pick another location."
                )
    ticket.issue_type = issue_type_for(building)
    if ticket.assigned_to_id is None:
        ticket.assigned_to_id = await pick_engineer(db, building, ticket.issue_type)
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
    # opened_at marks when work was acknowledged (left Open); closed_at when the ticket was closed
    if ticket.status != TicketStatus.OPEN and ticket.opened_at is None:
        ticket.opened_at = func.now()
    if ticket.status == TicketStatus.CLOSED and ticket.closed_at is None:
        ticket.closed_at = func.now()
    elif ticket.status != TicketStatus.CLOSED:
        ticket.closed_at = None
    ticket.priority = payload.priority
    ticket.issue_type = payload.issue_type
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
