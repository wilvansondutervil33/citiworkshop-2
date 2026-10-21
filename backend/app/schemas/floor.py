from pydantic import BaseModel, ConfigDict, Field

class FloorBase(BaseModel):
    building_id: int    
    capacity: int = Field(ge=1, le=100)
    floor_number: int = Field(ge=1, le=100)

class FloorCreate(FloorBase):
    pass

class FloorRead(FloorBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class FloorUpdate(FloorBase):
    pass


