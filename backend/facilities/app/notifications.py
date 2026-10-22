"""Tells a ticket's reporter and assigned engineer about changes: an in-app notification plus an email.

Emails go to the email_outbox table. With EMAIL_MODE=ses they're also sent through AWS SES
(which needs a verified sender, network access to SES and ses:SendEmail on the Lambda role).
Email problems are recorded on the outbox row and never fail the request that caused them.
"""
import logging

from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import EmailOutbox, Engineer, Notification, Ticket, User

logger = logging.getLogger(__name__)


def ticket_code(ticket_id: int) -> str:
    return f"INC-{ticket_id:04d}"


async def ticket_watchers(db: AsyncSession, ticket: Ticket, actor: User) -> list[User]:
    """The reporter and the assigned engineer's user, minus whoever made the change; active users only."""
    user_ids = {ticket.created_by_id}
    if ticket.assigned_to_id:
        engineer = await db.get(Engineer, ticket.assigned_to_id)
        if engineer:
            user_ids.add(engineer.user_id)
    user_ids.discard(actor.id)

    watchers = []
    for user_id in sorted(user_ids):
        user = await db.get(User, user_id)
        if user and user.is_active:
            watchers.append(user)
    return watchers


def _send_with_ses(to_email: str, subject: str, body: str) -> None:
    import boto3  # included in the AWS Lambda Python runtime; only needed in ses mode

    boto3.client("sesv2").send_email(
        FromEmailAddress=settings.email_from,
        Destination={"ToAddresses": [to_email]},
        Content={"Simple": {"Subject": {"Data": subject}, "Body": {"Text": {"Data": body}}}},
    )


async def send_email(db: AsyncSession, to_email: str, subject: str, body: str) -> EmailOutbox:
    email = EmailOutbox(to_email=to_email, subject=subject, body=body, status="logged")
    if settings.email_mode == "ses":
        try:
            await run_in_threadpool(_send_with_ses, to_email, subject, body)
            email.status = "sent"
        except Exception as error:  # noqa: BLE001 - any SES/network failure is recorded, not raised
            email.status = "failed"
            email.error = str(error)[:1000]
            logger.warning("Email to %s failed: %s", to_email, error)
    else:
        logger.info("Email (outbox mode) to %s: %s", to_email, subject)
    db.add(email)
    return email


async def notify_ticket_watchers(db: AsyncSession, ticket: Ticket, actor: User, kind: str, summary: str) -> None:
    """Adds notifications and emails for a change on `ticket`; the caller commits.

    summary is a short phrase like "status changed to In Progress" or "Liam Ortiz added a note".
    """
    code = ticket_code(ticket.id)
    for user in await ticket_watchers(db, ticket, actor):
        db.add(Notification(user_id=user.id, ticket_id=ticket.id, kind=kind, message=f"{code}: {summary}"))
        body = (
            f"Hi {user.name},\n\n"
            f"There's an update on {code} \"{ticket.title}\":\n"
            f"{summary}.\n\n"
            "Open ACME Facilities Desk to see the ticket.\n\n"
            "You're receiving this because you reported or are working on this ticket."
        )
        await send_email(db, user.email, f"{code}: {summary}", body)
