import asyncio

from sqlalchemy import text

from app.database import engine

# Adds notes.author_id (the user who wrote the note) and makes engineer_id optional,
# so employees and admins can write notes too. Safe to run more than once.
async def add_note_author() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id)"))
        # Existing notes were all written by their engineer
        await conn.execute(text("""
            UPDATE notes SET author_id = engineers.user_id
            FROM engineers
            WHERE notes.engineer_id = engineers.id AND notes.author_id IS NULL
        """))
        await conn.execute(text("ALTER TABLE notes ALTER COLUMN author_id SET NOT NULL"))
        await conn.execute(text("ALTER TABLE notes ALTER COLUMN engineer_id DROP NOT NULL"))

if __name__ == "__main__":
    asyncio.run(add_note_author())
