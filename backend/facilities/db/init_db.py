import asyncio
from pathlib import Path

import asyncpg
from sqlalchemy import func, select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import User
from scripts.create_tables import create_tables
from scripts.seed_users import seed_users

SEEDS_SQL = Path(__file__).with_name("seeds.sql")

# Creates any missing tables, then loads the demo data into an empty database.
# Safe to run more than once: it never re-seeds a database that already has users.
async def init_db() -> dict:
    await create_tables()

    async with AsyncSessionLocal() as session:
        user_count = (await session.execute(select(func.count(User.id)))).scalar_one()
    if user_count:
        return {"tables": "ready", "seeded": False, "reason": f"{user_count} users already exist"}

    await seed_users()

    # seeds.sql has many statements, which only a raw asyncpg connection runs in one call
    dsn = settings.sqlalchemy_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    conn = await asyncpg.connect(dsn, ssl="require" if settings.is_lambda else None)
    try:
        await conn.execute(SEEDS_SQL.read_text())
    finally:
        await conn.close()

    return {"tables": "ready", "seeded": True}

if __name__ == "__main__":
    print(asyncio.run(init_db()))
