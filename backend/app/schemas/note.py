from pydantic import BaseModel, ConfigDict, Field

class NoteBase(BaseModel):
    ticket_id: int
    body: str = Field(min_length=1)

class NoteCreate(NoteBase):
    "Author comes from the logged-in user"

class NoteRead(NoteBase):
    id:int
    author_id: int
    engineer_id: int | None = None

    model_config = ConfigDict(from_attributes=True)

class NoteUpdate(BaseModel):
    body: str = Field(min_length=1)
