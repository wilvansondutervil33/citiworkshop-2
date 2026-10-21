import asyncio

from sqlalchemy import text

from app.database import engine
from app.models import Department

# Departments for the buildings in data/seeds.sql
SEED_DEPARTMENTS = {
    1: Department.SOFTWARE,     # HQ Tower
    2: Department.PLUMBING,     # North Campus
    3: Department.HARDWARE,     # Riverside Office
    4: Department.NETWORK,      # Tech Center
    5: Department.STRUCTURAL,   # Annex West
}

# Adds the department enum and column to an existing buildings table. Safe to run more than once.
async def add_building_department() -> None:
    values = ", ".join(f"'{d.value}'" for d in Department)
    async with engine.begin() as conn:
        await conn.execute(text(f"""
            DO $$ BEGIN
                CREATE TYPE department AS ENUM ({values});
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        """))
        await conn.execute(text("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS department department"))
        for building_id, department in SEED_DEPARTMENTS.items():
            await conn.execute(
                text("UPDATE buildings SET department = CAST(:department AS department) WHERE id = :id AND department IS NULL"),
                {"department": department.value, "id": building_id},
            )

if __name__ == "__main__":
    asyncio.run(add_building_department())
