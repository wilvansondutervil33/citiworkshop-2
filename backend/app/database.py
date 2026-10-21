import os
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.config import settings

DATABASE_URL = settings.database_url

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

