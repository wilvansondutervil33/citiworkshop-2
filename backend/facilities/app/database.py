from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from app.config import settings

DATABASE_URL = settings.sqlalchemy_url

if settings.is_lambda:
    # Aurora requires TLS. No pooling: each Lambda invocation may run on a new event loop,
    # and pooled asyncpg connections can't be reused across loops.
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool, connect_args={"ssl": "require"})
else:
    engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
