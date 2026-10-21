from __future__ import annotations
from sqlalchemy import Integer, Boolean, CheckConstraint, String, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from .base import Base
from .enums import UserRole

if TYPE_CHECKING:
    from .ticket import Ticket

class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint("email LIKE '%@acme.inc'", name="ck_users_acme_email"),
        CheckConstraint("email = lower(email)", name="ck_users_email_lowercase"),
    )

    id:Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(25))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role:Mapped[UserRole] = mapped_column(
        SqlEnum(
            UserRole,
            name = "user_role",
            values_callable = lambda enum_cls : [m.value for m in enum_cls],
        )
    ) 
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_tickets: Mapped[list["Ticket"]] = relationship(back_populates="created_by")