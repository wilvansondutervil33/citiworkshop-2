from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Engineer, Note, Ticket, User, UserRole
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("", response_model=list[NoteRead], status_code= status.HTTP_200_OK)
async def get_list_notes(db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> list[Note]:
    
    statement = select(Note)
    statement = statement.order_by(Note.id)

    res = await db.execute(statement)
    return list(res.scalars().all())

@router.get("/{eid}", response_model=NoteRead, status_code= status.HTTP_200_OK)
async def get_note(eid:int, db:AsyncSession =  Depends(get_db), _:User = Depends(get_current_user)) -> Note:
    note = await db.get(Note, eid) 

    if note == None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Note {eid} is not found"
                )
    return note

@router.post("", response_model=NoteRead, status_code= status.HTTP_201_CREATED)
async def create_note(payload: NoteCreate ,db: AsyncSession = Depends(get_db), current_user:User = Depends(get_current_user)) -> Note:

    ticket = await db.get(Ticket, payload.ticket_id)
    if ticket is None:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Ticket {payload.ticket_id} is not found"
                )

    res = await db.execute(select(Engineer).where(Engineer.user_id == current_user.id))
    engineer = res.scalar_one_or_none()

    # Employees note their own tickets, engineers their assigned tickets, admins any ticket
    allowed = (
        current_user.role == UserRole.FACILITY_ADMIN
        or (current_user.role == UserRole.EMPLOYEE and ticket.created_by_id == current_user.id)
        or (current_user.role == UserRole.ENGINEER and engineer is not None and ticket.assigned_to_id == engineer.id)
    )
    if not allowed:
        raise HTTPException(
                    status_code= status.HTTP_403_FORBIDDEN,
                    detail= "You can only add notes to tickets you reported or are assigned to"
                )

    note = Note(
        ticket_id = payload.ticket_id,
        body = payload.body,
        author_id = current_user.id,
        engineer_id = engineer.id if engineer else None,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return note

@router.put("/{eid}", response_model=NoteUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_note(eid:int, payload: NoteUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Note:
    
    note = await db.get(Note, eid)

    note.body = payload.body
    note.edited_at = func.now()

    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note

@router.put("/deactive/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def deactive_note(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    note = await db.get(Note, eid)
    note.is_active = False
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note     

@router.put("/active/{eid}",  status_code= status.HTTP_202_ACCEPTED)
async def active_note(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    note = await db.get(Note, eid)
    note.is_active = True
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note     

@router.delete("/{eid}", status_code= status.HTTP_204_NO_CONTENT)
async def delete_note(eid:int, db:AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))):

    note = await db.get(Note, eid)
    await db.delete(note)
    await db.commit()

    return Response(status_code=204)
