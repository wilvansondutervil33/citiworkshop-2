from pydantic import BaseModel, ConfigDict, Field

class NoteBase(BaseModel):
    ticket_id: int
    engineer_id: int
    body: str
    
class NoteCreate(NoteBase):
    "Same Fields"

class NoteRead(NoteBase):
    id:int

    model_config = ConfigDict(from_attributes=True)

class NoteUpdate(NoteBase):
    "Same Fields"
