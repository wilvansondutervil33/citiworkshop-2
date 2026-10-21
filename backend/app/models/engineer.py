from __future__ import annotations
from typing import TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Boolean, Integer, String, Numeric, CheckConstraint, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .building import Building
    from .ticket import Ticket
    from .note import Note

class Engineer(Base):
    __tablename__ = "engineers"

    id:Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    max_workload: Mapped[int] = mapped_column(Integer, default=5)
    building_id: Mapped[int] = mapped_column(Integer, ForeignKey("buildings.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    

    building: Mapped["Building"] = relationship(back_populates="engineers")
    assigned_tickets: Mapped[list["Ticket"]] = relationship(back_populates="assigned_to")
    notes: Mapped[list["Note"]] = relationship(back_populates="engineer")