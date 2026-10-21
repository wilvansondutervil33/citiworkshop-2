from __future__ import annotations
from typing import TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Integer, Text, String, Numeric, CheckConstraint, func, DateTime, ForeignKey, Boolean, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from .base import Base

if TYPE_CHECKING:
    from .engineer import Engineer

class Note(Base):
    __tablename__ = "notes"
    # __table_args__ = (
    #     Index("ix_ticket_notes_incident_created", "incident_id", "created_at"),
    # )

    id: Mapped[int] = mapped_column(primary_key=True)

    ticket_id: Mapped[int] = mapped_column(Integer, ForeignKey("tickets.id"))
    # The user who wrote the note; engineer_id is only set when that user is an engineer
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    engineer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("engineers.id"), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    ticket: Mapped["Ticket"] = relationship(back_populates="notes")
    engineer: Mapped["Engineer"] = relationship(back_populates="notes")