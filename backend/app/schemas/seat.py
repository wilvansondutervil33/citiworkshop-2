from pydantic import BaseModel, ConfigDict, Field

class SeatBase(BaseModel):
    floor_id: int
    seat_type:str

class SeatCreate(SeatBase):
    pass

class SeatRead(SeatBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class SeatUpdate(SeatBase):
    pass
    


