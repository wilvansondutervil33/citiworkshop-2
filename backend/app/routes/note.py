from decimal import Decimal
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.models import Note, User, UserRole
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

@router.post("", response_model=NoteCreate, status_code= status.HTTP_201_CREATED)
async def create_note(payload: NoteCreate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Note:
    
    note = Note(**payload.model_dump())
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return note

@router.put("/{eid}", response_model=NoteUpdate, status_code= status.HTTP_202_ACCEPTED)
async def update_note(eid:int, payload: NoteUpdate ,db: AsyncSession = Depends(get_db), _:User = Depends(require_role(UserRole.FACILITY_ADMIN))) -> Note:
    
    note = await db.get(Note, eid)

    note.name = payload.name
    note.address = payload.address

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
