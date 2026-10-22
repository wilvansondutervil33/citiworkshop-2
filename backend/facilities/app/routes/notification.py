from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models import Notification, User
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=list[NotificationRead], status_code= status.HTTP_200_OK)
async def list_notifications(
    unread_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notification]:
    """The signed-in user's notifications, newest first (unread ones by default)."""
    statement = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        statement = statement.where(Notification.read_at.is_(None))
    statement = statement.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(50)
    res = await db.execute(statement)
    return list(res.scalars().all())

@router.put("/read-all", status_code= status.HTTP_202_ACCEPTED)
async def mark_all_read(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    res = await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .values(read_at=func.now())
    )
    await db.commit()
    return {"marked_read": res.rowcount}

@router.put("/{nid}/read", response_model=NotificationRead, status_code= status.HTTP_202_ACCEPTED)
async def mark_read(nid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> Notification:
    notification = await db.get(Notification, nid)
    # Someone else's notification is reported as missing rather than forbidden
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND,
                    detail= f"Notification {nid} is not found"
                )
    if notification.read_at is None:
        notification.read_at = func.now()
        await db.commit()
        await db.refresh(notification)
    return notification
