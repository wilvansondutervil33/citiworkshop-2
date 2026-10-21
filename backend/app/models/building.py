from __future__ import annotations
from typing import TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Boolean, Integer, String, Numeric, CheckConstraint, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .floor import Floor
    from .engineer import Engineer

class Building(Base):
    __tablename__ = "buildings"

    id:Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(25))
    address: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    

    floors: Mapped[list["Floor"]] = relationship(back_populates="building")
    engineers: Mapped[list["Engineer"]] = relationship(back_populates="building")