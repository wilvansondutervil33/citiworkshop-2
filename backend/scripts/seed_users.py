import asyncio

from app.database import AsyncSessionLocal
from app.models import User, UserRole
from app.security import hash_password

async def seed_users() -> None:
    async with AsyncSessionLocal() as session: 
        session.add_all([
            User(email="admin@acme.inc", name="Admin1", hashed_password=hash_password("AdminPass123!"), role=UserRole.FACILITY_ADMIN),
            User(email="ben.carter@acme.inc", name="Ben Carter", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="chloe.diaz@acme.inc", name="Chloe Diaz", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="daniel.evans@acme.inc", name="Daniel Evans", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="emma.foster@acme.inc", name="Emma Foster", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="frank.garcia@acme.inc", name="Frank Garcia", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="grace.hall@acme.inc", name="Grace Hall", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="henry.irwin@acme.inc", name="Henry Irwin", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="isla.jones@acme.inc", name="Isla Jones", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="jack.kim@acme.inc", name="Jack Kim", hashed_password=hash_password("EmployeePass123!"), role=UserRole.EMPLOYEE),
            User(email="liam.ortiz@acme.inc", name="Liam Ortiz", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="mia.patel@acme.inc", name="Mia Patel", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="noah.reed@acme.inc", name="Noah Reed", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="olivia.shaw@acme.inc", name="Olivia Shaw", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="paul.turner@acme.inc", name="Paul Turner", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="quinn.vega@acme.inc", name="Quinn Vega", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="ruby.walsh@acme.inc", name="Ruby Walsh", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="sam.young@acme.inc", name="Sam Young", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="tara.zane@acme.inc", name="Tara Zane", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
            User(email="uma.bennett@acme.inc", name="Uma Bennett", hashed_password=hash_password("EngineerPass123!"), role=UserRole.ENGINEER),
        ]) 
        await session.commit()

if __name__ == "__main__":
    asyncio.run(seed_users())