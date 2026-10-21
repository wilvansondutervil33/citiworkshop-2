from pydantic import BaseModel, ConfigDict, Field
from app.models import SeatType

class SeatBase(BaseModel):
    floor_id: int
    seat_type: SeatType = SeatType.DESK

class SeatCreate(SeatBase):
    pass

class SeatRead(SeatBase):
    id: int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class SeatUpdate(SeatBase):
    pass
    


