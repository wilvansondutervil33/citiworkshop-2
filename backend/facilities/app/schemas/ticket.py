from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models import IssueType

class TicketBase(BaseModel):
    title: str
    description: str
    status:str
    priority: str
    issue_type: IssueType = IssueType.OTHER
    assigned_to_id:int | None = Field(default=None) 
    created_by_id: int
    location_id:int
    
class TicketCreate(TicketBase):
    "Same Fields"

class TicketRead(TicketBase):
    id:int
    created_at: datetime | None = None
    opened_at: datetime | None = None
    closed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class TicketUpdate(TicketBase):
    "Same Fields"
