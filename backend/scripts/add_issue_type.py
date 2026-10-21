import asyncio

from sqlalchemy import text

from app.database import engine
from app.models import IssueType

# Issue types for the tickets in data/seeds.sql
SEED_ISSUE_TYPES = {
    1: IssueType.OTHER,        # Air conditioning
    2: IssueType.HARDWARE,     # Monitor flickering
    3: IssueType.NETWORK,      # Wi-Fi drops
    4: IssueType.STRUCTURAL,   # Broken desk chair
    5: IssueType.PLUMBING,     # Leaking tap
    6: IssueType.HARDWARE,     # Projector
    7: IssueType.HARDWARE,     # Desk lamp
    8: IssueType.HARDWARE,     # Docking station
    9: IssueType.STRUCTURAL,   # Ceiling lights
    10: IssueType.HARDWARE,    # Badge reader
}

# Adds the issue_type enum and column to an existing tickets table. Safe to run more than once.
async def add_issue_type() -> None:
    values = ", ".join(f"'{t.value}'" for t in IssueType)
    async with engine.begin() as conn:
        await conn.execute(text(f"""
            DO $$ BEGIN
                CREATE TYPE issue_type AS ENUM ({values});
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        """))
        await conn.execute(text(
            f"ALTER TABLE tickets ADD COLUMN IF NOT EXISTS issue_type issue_type NOT NULL DEFAULT '{IssueType.OTHER.value}'"
        ))
        for ticket_id, issue_type in SEED_ISSUE_TYPES.items():
            await conn.execute(
                text("UPDATE tickets SET issue_type = CAST(:issue_type AS issue_type) WHERE id = :id AND issue_type = 'Other'"),
                {"issue_type": issue_type.value, "id": ticket_id},
            )

if __name__ == "__main__":
    asyncio.run(add_issue_type())
