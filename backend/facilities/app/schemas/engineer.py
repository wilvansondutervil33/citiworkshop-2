from pydantic import BaseModel, ConfigDict, Field

class EngineerBase(BaseModel):
    user_id: int
    max_workload: int = Field(default=5, ge=1)
    building_id: int 
    
    
class EngineerCreate(EngineerBase):
    "Same Fields"

class EngineerRead(EngineerBase):
    id:int

    model_config = ConfigDict(from_attributes=True)

class EngineerUpdate(EngineerBase):
    "Same Fields"
