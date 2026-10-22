from datetime import datetime

from pydantic import BaseModel, ConfigDict

class NotificationRead(BaseModel):
    id: int
    ticket_id: int
    kind: str
    message: str
    created_at: datetime | None = None
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
