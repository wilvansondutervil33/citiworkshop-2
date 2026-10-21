from pydantic import BaseModel, ConfigDict, Field
from app.models import Department

class BuildingBase(BaseModel):
    name: str = Field(min_length=2, max_length=25)
    address: str = Field(min_length=5, max_length=200)
    department: Department | None = None

class BuildingCreate(BuildingBase):
    pass

class BuildingRead(BuildingBase):
    id: int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class BuildingUpdate(BuildingBase):
    pass
    


