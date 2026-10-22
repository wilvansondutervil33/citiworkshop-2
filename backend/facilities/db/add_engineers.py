"""Adds demo engineers, spread evenly over the active buildings (round-robin by building id).

Skips anyone whose email already exists, so running it again doesn't create duplicates.

    python -m db.add_engineers          # add the 40 engineers below
"""
import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Building, Engineer, User, UserRole
from app.security import hash_password

DEMO_PASSWORD = "EngineerPass123!"
MAX_WORKLOAD = 5

ENGINEER_NAMES = [
    "Aaron Blake", "Bella Cruz", "Caleb Dunn", "Daisy Ellis", "Ethan Ford", "Fiona Grant", "Gavin Hayes", "Hannah Ivers",
    "Ian Jensen", "Julia Knox", "Kevin Lowe", "Laura Mason", "Marcus Nash", "Nina Owens", "Oscar Price", "Paula Quinn",
    "Ryan Rhodes", "Sara Stone", "Tyler Tate", "Ursula Vance", "Victor Wade", "Wendy Xu", "Xavier York", "Yasmin Zhou",
    "Zane Adler", "Amber Brooks", "Brian Chase", "Clara Doyle", "Derek Evans", "Elena Fox", "Felix Gray", "Gina Holt",
    "Hector Irwin", "Ivy James", "Jonah Kerr", "Kira Lang", "Leo Marsh", "Maya Noble", "Nolan Ortiz", "Olive Park",
]


def email_for(name: str) -> str:
    return f"{name.lower().replace(' ', '.')}@acme.inc"


async def add_engineers(names: list[str] = ENGINEER_NAMES) -> dict:
    async with AsyncSessionLocal() as session:
        buildings = (await session.execute(
            select(Building.id).where(Building.is_active == True).order_by(Building.id)
        )).scalars().all()
        if not buildings:
            raise RuntimeError("Add at least one active building before adding engineers")

        existing = set((await session.execute(select(User.email))).scalars().all())
        hashed = hash_password(DEMO_PASSWORD)  # one hash shared by the demo accounts keeps this fast

        added, skipped, per_building = [], [], {}
        for index, name in enumerate(names):
            email = email_for(name)
            if email in existing:
                skipped.append(email)
                continue
            building_id = buildings[index % len(buildings)]
            user = User(email=email, name=name, hashed_password=hashed, role=UserRole.ENGINEER)
            session.add(user)
            await session.flush()  # assigns user.id
            session.add(Engineer(user_id=user.id, building_id=building_id, max_workload=MAX_WORKLOAD))
            added.append(email)
            per_building[building_id] = per_building.get(building_id, 0) + 1

        await session.commit()
    return {"engineers_added": len(added), "skipped_existing": len(skipped), "per_building": per_building}


if __name__ == "__main__":
    print(asyncio.run(add_engineers()))
