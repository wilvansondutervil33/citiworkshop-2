from __future__ import annotations
from typing import TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Boolean, Integer, String, Numeric, CheckConstraint, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .floor import Floor
    from .ticket import Ticket
    

class Seat(Base):
    __tablename__ = "seats"

    id:Mapped[int] = mapped_column(Integer, primary_key=True)
    seat_type: Mapped[int] = mapped_column(Integer)
    floor_id: Mapped[int] = mapped_column(Integer, ForeignKey("floors.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    

    floor: Mapped["Floor"] = relationship(back_populates="seats")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="location")