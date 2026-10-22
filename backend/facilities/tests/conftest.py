"""Test setup: a throwaway PostgreSQL database seeded with the demo data.

The models use PostgreSQL enum types, so the tests run against the same local
Postgres server as development (from backend/facilities/.env), in a separate
database that is created before the app is imported and dropped afterwards.
"""
import asyncio
import itertools
import os
import sys
from pathlib import Path

import asyncpg
import pytest
from dotenv import dotenv_values

SERVICE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_DIR))

_env = dotenv_values(SERVICE_DIR / ".env")
_dev_url = os.environ.get("DATABASE_URL") or _env.get("DATABASE_URL")
if not _dev_url:
    raise RuntimeError("Tests need DATABASE_URL in backend/facilities/.env to find the local PostgreSQL server")

TEST_DB = "acme_facilities_test"
_server = _dev_url.rsplit("/", 1)[0]
_admin_dsn = _server.replace("postgresql+asyncpg://", "postgresql://", 1) + "/postgres"

os.environ["DATABASE_URL"] = f"{_server}/{TEST_DB}"
os.environ.setdefault("SECRET_KEY", _env.get("SECRET_KEY") or "test-secret-key")
os.environ.pop("AWS_LAMBDA_FUNCTION_NAME", None)


async def _admin(sql: str) -> None:
    conn = await asyncpg.connect(_admin_dsn)
    try:
        await conn.execute(sql)
    finally:
        await conn.close()


async def _create_and_seed() -> None:
    await _admin(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)")
    await _admin(f"CREATE DATABASE {TEST_DB}")
    from app.database import engine
    from db.init_db import init_db
    await init_db()
    # The pool's connections belong to this event loop; the test client runs its own
    await engine.dispose()


asyncio.run(_create_and_seed())

from fastapi.testclient import TestClient  # noqa: E402  (after DATABASE_URL is set)
from app.main import app  # noqa: E402

ADMIN = ("admin@acme.inc", "AdminPass123!")
EMPLOYEE = ("ben.carter@acme.inc", "EmployeePass123!")         # user id 2
OTHER_EMPLOYEE = ("chloe.diaz@acme.inc", "EmployeePass123!")   # user id 3
ENGINEER = ("liam.ortiz@acme.inc", "EngineerPass123!")         # engineer id 1, HQ Tower
PASSWORD = "TestPass123!"


def pytest_sessionfinish(session, exitstatus):
    asyncio.run(_admin(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)"))


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


def login(client, email, password):
    response = client.post("/auth/token", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return login(client, *ADMIN)


@pytest.fixture(scope="session")
def employee(client):
    return login(client, *EMPLOYEE)


@pytest.fixture(scope="session")
def other_employee(client):
    return login(client, *OTHER_EMPLOYEE)


@pytest.fixture(scope="session")
def engineer(client):
    return login(client, *ENGINEER)


_ids = itertools.count(1)


class Factory:
    """Creates fresh data through the API so tests don't depend on each other."""

    def __init__(self, client, admin_headers):
        self.client = client
        self.admin = admin_headers

    def _ok(self, response, status=201):
        assert response.status_code == status, response.text
        return response.json()

    def building(self, department="Hardware"):
        n = next(_ids)
        return self._ok(self.client.post("/buildings", headers=self.admin,
                                         json={"name": f"Test Bldg {n}", "address": f"{n} Test Street", "department": department}))

    def floor(self, building_id, capacity=10, floor_number=1):
        return self._ok(self.client.post("/floors", headers=self.admin,
                                         json={"building_id": building_id, "floor_number": floor_number, "capacity": capacity}))

    def seat(self, floor_id, seat_type="Desk"):
        return self._ok(self.client.post("/seats", headers=self.admin, json={"floor_id": floor_id, "seat_type": seat_type}))

    def location(self, department="Hardware", capacity=10):
        """A new building with one floor and one seat; returns (building, floor, seat)."""
        building = self.building(department)
        floor = self.floor(building["id"], capacity=capacity)
        return building, floor, self.seat(floor["id"])

    def user(self, role="Employee"):
        n = next(_ids)
        return self._ok(self.client.post("/auth/register", headers=self.admin, json={
            "name": f"Test User {n}", "email": f"test.user{n}@acme.inc", "role": role, "hashed_password": PASSWORD,
        }))

    def engineer(self, building_id, max_workload=5):
        """A new engineer user with a profile in the building; returns (user, engineer, auth headers)."""
        user = self.user("Engineer")
        self._ok(self.client.post("/engineers", headers=self.admin,
                                  json={"user_id": user["id"], "building_id": building_id, "max_workload": max_workload}))
        profile = next(e for e in self.client.get("/engineers", headers=self.admin).json() if e["user_id"] == user["id"])
        return user, profile, login(self.client, user["email"], PASSWORD)

    def ticket(self, headers, seat_id, created_by_id=2, **fields):
        payload = {"title": "Test ticket", "description": "Created by the test suite", "status": "Open",
                   "priority": "Low", "created_by_id": created_by_id, "location_id": seat_id, **fields}
        return self._ok(self.client.post("/tickets", headers=headers, json=payload))


@pytest.fixture
def make(client, admin):
    return Factory(client, admin)
