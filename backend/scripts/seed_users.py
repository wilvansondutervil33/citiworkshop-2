import asyncio

from app.database import AsyncSessionLocal
from app.models import User, UserRole
from app.security import hash_password

async def seed_users() -> None:
    async with AsyncSessionLocal() as session: 
        session.add_all([
            User(email="admin@acme.inc", name="Admin1", hashed_password=hash_password("AdminPass123!"), role=UserRole.FACILITY_ADMIN),
            User(email="employee@acme.inc", name="Employee1", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="engineer@acme.inc", name="Engineer1", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="demo@acme.inc", name="Demo", hashed_password=hash_password("DemoPass123!"), role=UserRole.FACILITY_ADMIN),
        ]) 
        await session.commit()

if __name__ == "__main__":
    asyncio.run(seed_users())