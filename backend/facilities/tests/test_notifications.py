"""Notifications and emails when a note is added or a ticket's status changes."""
import asyncio

import pytest
from sqlalchemy import select

from app.database import engine, AsyncSessionLocal
from app.models import EmailOutbox
from conftest import EMPLOYEE


def notifications_for(client, headers, ticket_id, unread_only=True):
    response = client.get("/notifications", headers=headers, params={"unread_only": unread_only})
    assert response.status_code == 200
    return [n for n in response.json() if n["ticket_id"] == ticket_id]


def set_status(client, headers, ticket_id, new_status):
    return client.put(f"/tickets/{ticket_id}/status", headers=headers, json={"status": new_status})


def outbox_for(email):
    # The test client's event loop owns the pooled connections, so use a fresh pool here
    async def go():
        await engine.dispose(close=False)
        try:
            async with AsyncSessionLocal() as session:
                rows = await session.execute(select(EmailOutbox).where(EmailOutbox.to_email == email).order_by(EmailOutbox.id))
                return [(e.subject, e.status, e.body) for e in rows.scalars()]
        finally:
            await engine.dispose()
    return asyncio.run(go())


@pytest.fixture
def assigned_ticket(make, employee):
    """A ticket Ben reported, auto-assigned to a fresh engineer; returns (ticket, engineer user, engineer headers)."""
    building, _, seat = make.location(department="Hardware")
    user, profile, headers = make.engineer(building["id"])
    ticket = make.ticket(employee, seat["id"], title="Fan rattling")
    assert ticket["assigned_to_id"] == profile["id"]
    return ticket, user, headers


# --- Notes -------------------------------------------------------------------

def test_engineer_note_notifies_the_reporter_not_the_author(client, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    client.post("/notes", headers=engineer_headers, json={"ticket_id": ticket["id"], "body": "Replacing the fan today."})

    ben = notifications_for(client, employee, ticket["id"])
    assert len(ben) == 1
    assert ben[0]["kind"] == "note"
    assert "added a note" in ben[0]["message"] and "Replacing the fan today." in ben[0]["message"]
    assert notifications_for(client, engineer_headers, ticket["id"]) == []


def test_reporter_note_notifies_the_engineer(client, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    client.post("/notes", headers=employee, json={"ticket_id": ticket["id"], "body": "It's louder in the afternoon."})

    assert len(notifications_for(client, engineer_headers, ticket["id"])) == 1
    assert notifications_for(client, employee, ticket["id"]) == []


def test_long_notes_are_shortened_in_the_notification(client, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    client.post("/notes", headers=engineer_headers, json={"ticket_id": ticket["id"], "body": "x" * 200})
    message = notifications_for(client, employee, ticket["id"])[0]["message"]
    assert message.endswith('..."') and len(message) < 150


# --- Status changes ----------------------------------------------------------

def test_engineer_moves_their_ticket_and_the_reporter_is_told(client, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket

    response = set_status(client, engineer_headers, ticket["id"], "In-Progress")
    assert response.status_code == 202
    assert response.json()["status"] == "In-Progress"
    assert response.json()["opened_at"] is not None

    ben = notifications_for(client, employee, ticket["id"])
    assert [n["message"] for n in ben] == [f"INC-{ticket['id']:04d}: status changed to In Progress"]


def test_engineer_cannot_skip_steps(client, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    response = set_status(client, engineer_headers, ticket["id"], "Closed")
    assert response.status_code == 400


def test_reporter_can_close_or_reopen_only_a_resolved_ticket(client, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    assert set_status(client, employee, ticket["id"], "Closed").status_code == 400  # still Open

    set_status(client, engineer_headers, ticket["id"], "In-Progress")
    set_status(client, engineer_headers, ticket["id"], "Resolved")

    reopened = set_status(client, employee, ticket["id"], "In-Progress")
    assert reopened.status_code == 202
    set_status(client, engineer_headers, ticket["id"], "Resolved")
    closed = set_status(client, employee, ticket["id"], "Closed")
    assert closed.status_code == 202
    assert closed.json()["closed_at"] is not None

    engineer_messages = [n["message"] for n in notifications_for(client, engineer_headers, ticket["id"])]
    assert any("In Progress" in m for m in engineer_messages)
    assert any("Closed" in m for m in engineer_messages)


def test_other_people_cannot_change_the_status(client, other_employee, engineer, assigned_ticket):
    ticket, _, _ = assigned_ticket
    assert set_status(client, other_employee, ticket["id"], "In-Progress").status_code == 403
    assert set_status(client, engineer, ticket["id"], "In-Progress").status_code == 403  # not assigned to Liam


def test_admin_status_change_notifies_reporter_and_engineer(client, admin, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    response = set_status(client, admin, ticket["id"], "Blocked")
    assert response.status_code == 202
    assert len(notifications_for(client, employee, ticket["id"])) == 1
    assert len(notifications_for(client, engineer_headers, ticket["id"])) == 1


def test_admin_full_update_notifies_only_when_status_changes(client, admin, employee, assigned_ticket):
    ticket, _, _ = assigned_ticket
    full = client.get(f"/tickets/{ticket['id']}", headers=admin).json()
    fields = ["title", "description", "status", "priority", "issue_type", "assigned_to_id", "created_by_id", "location_id"]
    payload = {f: full[f] for f in fields}

    client.put(f"/tickets/{ticket['id']}", headers=admin, json={**payload, "priority": "Critical"})
    assert notifications_for(client, employee, ticket["id"]) == []

    client.put(f"/tickets/{ticket['id']}", headers=admin, json={**payload, "status": "In-Progress"})
    assert len(notifications_for(client, employee, ticket["id"])) == 1


def test_status_route_validates_status_and_ticket(client, admin, assigned_ticket):
    ticket, _, _ = assigned_ticket
    assert set_status(client, admin, ticket["id"], "Banana").status_code == 422
    assert set_status(client, admin, 999999, "Open").status_code == 404


def test_deactivated_reporter_is_not_notified(client, admin, make):
    building, _, seat = make.location(department="Hardware")
    _, _, engineer_headers = make.engineer(building["id"])
    reporter = make.user()
    ticket = make.ticket(admin, seat["id"], created_by_id=reporter["id"])
    client.put(f"/users/deactive/{reporter['id']}", headers=admin)

    set_status(client, engineer_headers, ticket["id"], "In-Progress")
    emails = outbox_for(reporter["email"])
    assert emails == []


# --- Reading notifications ---------------------------------------------------

def test_marking_one_read_hides_it_from_the_unread_list(client, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    set_status(client, engineer_headers, ticket["id"], "In-Progress")
    unread = notifications_for(client, employee, ticket["id"])

    response = client.put(f"/notifications/{unread[0]['id']}/read", headers=employee)
    assert response.status_code == 202
    assert response.json()["read_at"] is not None
    assert notifications_for(client, employee, ticket["id"]) == []
    assert len(notifications_for(client, employee, ticket["id"], unread_only=False)) == 1


def test_mark_all_read(client, employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    set_status(client, engineer_headers, ticket["id"], "In-Progress")
    client.post("/notes", headers=engineer_headers, json={"ticket_id": ticket["id"], "body": "On it."})
    assert len(notifications_for(client, employee, ticket["id"])) == 2

    response = client.put("/notifications/read-all", headers=employee)
    assert response.status_code == 202
    assert response.json()["marked_read"] >= 2
    assert client.get("/notifications", headers=employee).json() == []


def test_cannot_read_someone_elses_notification(client, employee, other_employee, assigned_ticket):
    ticket, _, engineer_headers = assigned_ticket
    set_status(client, engineer_headers, ticket["id"], "In-Progress")
    notification = notifications_for(client, employee, ticket["id"])[0]
    assert client.put(f"/notifications/{notification['id']}/read", headers=other_employee).status_code == 404


# --- Emails ------------------------------------------------------------------

def test_emails_are_written_to_the_outbox(client, assigned_ticket):
    ticket, engineer_user, engineer_headers = assigned_ticket
    set_status(client, engineer_headers, ticket["id"], "In-Progress")

    code = f"INC-{ticket['id']:04d}"
    emails = [e for e in outbox_for(EMPLOYEE[0]) if e[0].startswith(code)]
    assert len(emails) == 1
    subject, status, body = emails[0]
    assert subject == f"{code}: status changed to In Progress"
    assert status == "logged"
    assert "Fan rattling" in body and "Hi Ben Carter" in body
    assert [e for e in outbox_for(engineer_user["email"]) if e[0].startswith(code)] == []
