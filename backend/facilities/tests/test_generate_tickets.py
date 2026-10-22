"""The sample-ticket generator behind bin/generate-tickets.sh."""
import asyncio
from datetime import datetime

import pytest

from app.database import engine
from db.generate_tickets import SAMPLE_MARKER, generate_tickets, remove_generated

ACTIVE = {"Open", "In-Progress", "Blocked"}


def run(coro_factory):
    # The test client's event loop owns the pooled connections, so use a fresh pool here
    async def go():
        await engine.dispose(close=False)
        try:
            return await coro_factory()
        finally:
            await engine.dispose()
    return asyncio.run(go())


@pytest.fixture(scope="module")
def generated(client, admin):
    before = len(client.get("/tickets", headers=admin).json())
    result = run(lambda: generate_tickets(300, days=60, seed=7))
    tickets = [t for t in client.get("/tickets", headers=admin).json() if t["description"].endswith(SAMPLE_MARKER)]
    yield {"result": result, "tickets": tickets, "before": before}
    run(remove_generated)


def test_adds_the_requested_number_of_marked_tickets(generated):
    assert generated["result"]["tickets_added"] == 300
    assert len(generated["tickets"]) == 300
    assert sum(generated["result"]["statuses"].values()) == 300


def test_dates_are_in_range_and_in_order(generated):
    now = datetime.now()
    for t in generated["tickets"]:
        created = datetime.fromisoformat(t["created_at"])
        assert (now - created).days <= 61
        if t["opened_at"]:
            assert datetime.fromisoformat(t["opened_at"]) >= created
        if t["closed_at"]:
            assert t["status"] == "Closed"
            assert datetime.fromisoformat(t["closed_at"]) >= datetime.fromisoformat(t["opened_at"])
        if t["status"] == "Open":
            assert t["opened_at"] is None


def test_issue_type_matches_building_and_engineers_belong_there(client, admin, generated):
    buildings = {b["id"]: b for b in client.get("/buildings", headers=admin, params={"include_inactive": True}).json()}
    floors = {f["id"]: f for f in client.get("/floors", headers=admin, params={"include_inactive": True}).json()}
    seats = {s["id"]: s for s in client.get("/seats", headers=admin, params={"include_inactive": True}).json()}
    engineers = {e["id"]: e for e in client.get("/engineers", headers=admin).json()}

    for t in generated["tickets"]:
        building = buildings[floors[seats[t["location_id"]]["floor_id"]]["building_id"]]
        assert t["issue_type"] == (building["department"] or "Other")
        if t["assigned_to_id"]:
            assert engineers[t["assigned_to_id"]]["building_id"] == building["id"]
        if t["issue_type"] == "Other":
            assert t["assigned_to_id"] is None


def test_most_old_tickets_are_closed_and_work_needs_an_engineer(generated):
    statuses = generated["result"]["statuses"]
    assert statuses.get("Closed", 0) > 150
    for t in generated["tickets"]:
        if t["status"] in {"In-Progress", "Blocked", "Resolved"}:
            assert t["assigned_to_id"] is not None


def test_engineers_stay_within_their_workload(client, admin, generated):
    engineers = {e["id"]: e for e in client.get("/engineers", headers=admin).json()}
    load = {}
    for t in client.get("/tickets", headers=admin).json():
        if t["assigned_to_id"] and t["status"] in ACTIVE and t["description"].endswith(SAMPLE_MARKER):
            load[t["assigned_to_id"]] = load.get(t["assigned_to_id"], 0) + 1
    for engineer_id, count in load.items():
        assert count <= engineers[engineer_id]["max_workload"]


def test_notes_are_written_by_the_assigned_engineer(client, admin, generated):
    by_id = {t["id"]: t for t in generated["tickets"]}
    engineers = {e["id"]: e for e in client.get("/engineers", headers=admin).json()}
    notes = [n for n in client.get("/notes", headers=admin).json() if n["ticket_id"] in by_id]
    assert len(notes) == generated["result"]["notes_added"] > 0
    for n in notes:
        ticket = by_id[n["ticket_id"]]
        assert n["engineer_id"] == ticket["assigned_to_id"]
        assert n["author_id"] == engineers[n["engineer_id"]]["user_id"]


def test_remove_deletes_only_generated_tickets(client, admin, generated):
    removed = run(remove_generated)
    assert removed["tickets_removed"] == 300
    remaining = client.get("/tickets", headers=admin).json()
    assert len(remaining) == generated["before"]
    assert not any(t["description"].endswith(SAMPLE_MARKER) for t in remaining)
