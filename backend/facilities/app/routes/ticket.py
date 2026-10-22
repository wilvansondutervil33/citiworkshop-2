from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Building, Engineer, Floor, IssueType, Seat, Ticket, TicketPriority, TicketStatus, User, UserRole
from app.schemas.ticket import TicketCreate, TicketRead, TicketStatusUpdate, TicketUpdate
from app.notifications import notify_ticket_watchers

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

def status_label(value) -> str:
    value = getattr(value, "value", value)
    return "In Progress" if value == "In-Progress" else value

def apply_status(ticket: Ticket, new_status: TicketStatus) -> None:
    """Sets the status and keeps the timestamps in step: opened_at marks when work was
    acknowledged (first left Open); closed_at is set when closed and cleared on reopen."""
    ticket.status = new_status
    if new_status != TicketStatus.OPEN and ticket.opened_at is None:
        ticket.opened_at = func.now()
    if new_status == TicketStatus.CLOSED and ticket.closed_at is None:
        ticket.closed_at = func.now()
    elif new_status != TicketStatus.CLOSED:
        ticket.closed_at = None

# New tickets get a priority from how long their issue type usually takes to close
LOW_PRIORITY_MAX_DAYS = 2      # under 2 days on average -> Low
MEDIUM_PRIORITY_MAX_DAYS = 3   # 2 to 3 days -> Medium; longer -> Critical

def priority_for_days(average_days: float | None) -> TicketPriority:
    if average_days is None or average_days < LOW_PRIORITY_MAX_DAYS:
        return TicketPriority.LOW  # includes issue types with no closed tickets yet
    if average_days <= MEDIUM_PRIORITY_MAX_DAYS:
        return TicketPriority.MEDIUM
    return TicketPriority.CRITICAL

async def priority_for(db: AsyncSession, issue_type: IssueType) -> TicketPriority:
    res = await db.execute(
        select(func.avg(func.extract("epoch", Ticket.closed_at - Ticket.created_at)))
        .where(Ticket.issue_type == issue_type, Ticket.closed_at.is_not(None), Ticket.created_at.is_not(None))
    )
    seconds = res.scalar_one_or_none()
    return priority_for_days(float(seconds) / 86400 if seconds is not None else None)

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
    # The reporter's issue type if they chose one, otherwise the building's department.
    # Engineers are only auto-assigned when it matches the building's department.
    if "issue_type" not in payload.model_fields_set:
        ticket.issue_type = issue_type_for(building)
    ticket.priority = await priority_for(db, ticket.issue_type)
    if ticket.assigned_to_id is None:
        ticket.assigned_to_id = await pick_engineer(db, building, ticket.issue_type)
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return ticket

@router.put("/{eid}", response_model=TicketUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_ticket(eid:int, payload: TicketUpdate ,db: AsyncSession = Depends(get_db), current_user:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Ticket:
    
    ticket = await db.get(Ticket, eid)
    if ticket is None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Ticket {eid} is not found"
                )
    old_status = TicketStatus(ticket.status)

    ticket.title = payload.title
    ticket.description = payload.description
    apply_status(ticket, TicketStatus(payload.status))
    ticket.priority = payload.priority
    ticket.issue_type = payload.issue_type
    ticket.assigned_to_id = payload.assigned_to_id
    ticket.created_by_id = payload.created_by_id
    ticket.location_id = payload.location_id

    if ticket.status != old_status:
        await notify_ticket_watchers(db, ticket, current_user, "status", f"status changed to {status_label(ticket.status)}")
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket

# Status moves an assigned engineer may make (matches the buttons in the app)
ENGINEER_STATUS_MOVES = {
    TicketStatus.OPEN: {TicketStatus.IN_PROGRESS},
    TicketStatus.IN_PROGRESS: {TicketStatus.BLOCKED, TicketStatus.RESOLVED},
    TicketStatus.BLOCKED: {TicketStatus.IN_PROGRESS},
}
# The reporter can confirm a fix (close) or say it's still broken (reopen)
REPORTER_STATUS_MOVES = {
    TicketStatus.RESOLVED: {TicketStatus.CLOSED, TicketStatus.IN_PROGRESS},
}

@router.put("/{eid}/status", response_model=TicketRead, status_code= status.HTTP_202_ACCEPTED)
async def update_ticket_status(eid:int, payload: TicketStatusUpdate, db: AsyncSession = Depends(get_db), current_user:User = Depends(get_current_user)) -> Ticket:
    """Change only the status. Admins: any status; the assigned engineer and the reporter: their usual moves."""
    ticket = await db.get(Ticket, eid)
    if ticket is None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Ticket {eid} is not found"
                )
    current = TicketStatus(ticket.status)
    new = payload.status

    if current_user.role != UserRole.FACILITY_ADMIN:
        res = await db.execute(select(Engineer).where(Engineer.user_id == current_user.id))
        engineer = res.scalar_one_or_none()
        is_assigned = engineer is not None and ticket.assigned_to_id == engineer.id
        is_reporter = ticket.created_by_id == current_user.id
        if not (is_assigned or is_reporter):
            raise HTTPException(
                        status_code= status.HTTP_403_FORBIDDEN,
                        detail= "You can only change the status of tickets you reported or are assigned to"
                    )
        allowed = set()
        if is_assigned:
            allowed |= ENGINEER_STATUS_MOVES.get(current, set())
        if is_reporter:
            allowed |= REPORTER_STATUS_MOVES.get(current, set())
        if new not in allowed:
            raise HTTPException(
                        status_code= status.HTTP_400_BAD_REQUEST,
                        detail= f"A ticket can't be moved from {status_label(current)} to {status_label(new)} by you"
                    )

    if new != current:
        apply_status(ticket, new)
        await notify_ticket_watchers(db, ticket, current_user, "status", f"status changed to {status_label(new)}")
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
