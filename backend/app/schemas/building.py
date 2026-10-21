from pydantic import BaseModel, ConfigDict, Field

class BuildingBase(BaseModel):
    name: str = Field(min_length=2, max_length=10)
    address: str = Field(min_length=5, max_length=200)

class BuildingCreate(BuildingBase):
    pass

class BuildingRead(BuildingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class BuildingUpdate(BuildingBase):
    pass
    


