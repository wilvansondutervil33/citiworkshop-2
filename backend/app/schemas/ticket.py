from pydantic import BaseModel, ConfigDict, Field

class TicketBase(BaseModel):
    title: str
    description: str
    status:str
    priority: str
    assigned_to_id:int | None = Field(default=None) 
    created_by_id: int
    location_id:int
    
class TicketCreate(TicketBase):
    "Same Fields"

class TicketRead(TicketBase):
    id:int

    model_config = ConfigDict(from_attributes=True)

class TicketUpdate(TicketBase):
    "Same Fields"
