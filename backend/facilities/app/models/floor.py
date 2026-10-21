from __future__ import annotations
from typing import TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Boolean, Integer, String, Numeric, CheckConstraint, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .building import Building
    from .seat import Seat
    

class Floor(Base):
    __tablename__ = "floors"

    id:Mapped[int] = mapped_column(Integer, primary_key=True)
    floor_number: Mapped[int] = mapped_column(Integer)
    capacity: Mapped[int] = mapped_column(Integer)
    building_id: Mapped[int] = mapped_column(Integer, ForeignKey("buildings.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    

    building: Mapped["Building"] = relationship(back_populates="floors")
    seats: Mapped[list["Seat"]] = relationship(back_populates="floor")