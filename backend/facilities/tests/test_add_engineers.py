"""The demo-engineer loader behind the "add-engineers" Lambda task."""
import asyncio

from app.database import engine
from db.add_engineers import DEMO_PASSWORD, add_engineers, email_for
from conftest import login


def run(coro_factory):
    # The test client's event loop owns the pooled connections, so use a fresh pool here
    async def go():
        await engine.dispose(close=False)
        try:
            return await coro_factory()
        finally:
            await engine.dispose()
    return asyncio.run(go())


def test_adds_engineers_spread_over_buildings_and_skips_existing(client, admin):
    names = ["Quinn Test", "Robin Test", "Sky Test", "Tal Test", "Uri Test", "Val Test", "Wes Test"]
    first = run(lambda: add_engineers(names))
    assert first["engineers_added"] == 7
    assert sum(first["per_building"].values()) == 7
    assert max(first["per_building"].values()) - min(first["per_building"].values()) <= 1

    users = {u["email"]: u for u in client.get("/users", headers=admin).json()}
    engineers = {e["user_id"]: e for e in client.get("/engineers", headers=admin).json()}
    for name in names:
        user = users[email_for(name)]
        assert user["role"] == "Engineer" and user["name"] == name
        assert engineers[user["id"]]["max_workload"] == 5
    login(client, email_for(names[0]), DEMO_PASSWORD)

    again = run(lambda: add_engineers(names))
    assert again == {"engineers_added": 0, "skipped_existing": 7, "per_building": {}}
