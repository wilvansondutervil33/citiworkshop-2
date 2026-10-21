from __future__ import annotations
from typing import TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Integer, String, Numeric, DateTime, func, CheckConstraint, ForeignKey, Boolean, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from .base import Base
from .enums import TicketPriority, TicketStatus

if TYPE_CHECKING:
    from .engineer import Engineer
    from .building import Building
    from .floor import Floor
    from .seat import Seat
    from .note import Note
    from .users import User


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key= True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(255))
    priority: Mapped[TicketPriority] = mapped_column(
        SqlEnum(
            TicketPriority,
            name="ticket_priority",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
    default=TicketPriority.LOW)
    status: Mapped[TicketStatus] = mapped_column(
        SqlEnum(
            TicketStatus,
            name="ticket_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
    default=TicketStatus.OPEN)
    assigned_to_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("engineers.id"))
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    location_id: Mapped[int] = mapped_column(Integer, ForeignKey("seats.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default= func.now())
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    assigned_to: Mapped["Engineer"] = relationship(back_populates="assigned_tickets")
    created_by: Mapped["User"] = relationship(back_populates="created_tickets")
    location: Mapped["Seat"] = relationship(back_populates="tickets")
    notes: Mapped[list["Note"]] = relationship(back_populates="ticket")

    
    

