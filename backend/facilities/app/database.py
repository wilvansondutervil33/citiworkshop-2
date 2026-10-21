import asyncio
import logging
import time

import asyncpg
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from app.config import settings

logger = logging.getLogger(__name__)

DATABASE_URL = settings.sqlalchemy_url

# How long to keep retrying while a paused Aurora database wakes up (~15-30 s).
# Requests through CloudFront must answer within its 30 s origin timeout; the init-db task raises this.
CONNECT_DEADLINE_SECONDS = 25
CONNECT_ATTEMPT_TIMEOUT_SECONDS = 5

async def connect_with_retry() -> asyncpg.Connection:
    dsn = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
    deadline = time.monotonic() + CONNECT_DEADLINE_SECONDS
    attempt = 0
    while True:
        attempt += 1
        try:
            return await asyncpg.connect(dsn, ssl="require", timeout=CONNECT_ATTEMPT_TIMEOUT_SECONDS)
        except (OSError, asyncio.TimeoutError, asyncpg.CannotConnectNowError) as error:
            remaining = deadline - time.monotonic()
            if remaining <= 1:
                raise
            logger.warning("Database connection attempt %d failed (%s: %s); retrying, it may be resuming",
                           attempt, type(error).__name__, error)
            await asyncio.sleep(min(2, remaining - 1))

if settings.is_lambda:
    # Aurora requires TLS and auto-pauses when idle, so connect through connect_with_retry.
    # No pooling: each Lambda invocation may run on a new event loop, and pooled asyncpg
    # connections can't be reused across loops.
    engine = create_async_engine("postgresql+asyncpg://", async_creator=connect_with_retry, poolclass=NullPool)
else:
    engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
