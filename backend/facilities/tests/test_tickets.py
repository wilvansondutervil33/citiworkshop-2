def update_payload(ticket, **changes):
    fields = ["title", "description", "status", "priority", "issue_type", "assigned_to_id", "created_by_id", "location_id"]
    return {**{f: ticket[f] for f in fields}, **changes}


def get_ticket(client, admin, ticket_id):
    response = client.get(f"/tickets/{ticket_id}", headers=admin)
    assert response.status_code == 200
    return response.json()


# --- Listing ---------------------------------------------------------------

def test_ticket_list_includes_timestamps_and_issue_type(client, admin):
    tickets = client.get("/tickets", headers=admin).json()
    seeded = next(t for t in tickets if t["id"] == 1)
    assert seeded["created_at"].startswith("2026-10-19T08:00")
    assert seeded["opened_at"].startswith("2026-10-19T09:00")
    assert seeded["closed_at"] is None
    assert seeded["issue_type"] == "Other"


def test_missing_ticket_is_404(client, admin):
    response = client.get("/tickets/999999", headers=admin)
    assert response.status_code == 404
    assert response.json()["detail"] == "Ticket 999999 is not found"


# --- Creating tickets ------------------------------------------------------

def test_issue_type_comes_from_the_building_department(client, employee, make):
    _, _, seat = make.location(department="Plumbing")
    ticket = make.ticket(employee, seat["id"], issue_type="Software")
    assert ticket["issue_type"] == "Plumbing"


def test_building_without_department_logs_other_and_stays_unassigned(client, employee, make):
    building, _, seat = make.location(department=None)
    make.engineer(building["id"])
    ticket = make.ticket(employee, seat["id"])
    assert ticket["issue_type"] == "Other"
    assert ticket["assigned_to_id"] is None


def test_auto_assigns_least_busy_engineer_in_the_building(client, employee, make):
    building, _, seat = make.location()
    _, first, _ = make.engineer(building["id"])
    _, second, _ = make.engineer(building["id"])

    one = make.ticket(employee, seat["id"])
    two = make.ticket(employee, seat["id"])
    three = make.ticket(employee, seat["id"])

    # Ties go to the lower engineer id, then load evens out
    assert one["assigned_to_id"] == first["id"]
    assert two["assigned_to_id"] == second["id"]
    assert three["assigned_to_id"] == first["id"]


def test_engineers_at_max_workload_are_skipped(client, employee, make):
    building, _, seat = make.location()
    _, engineer, _ = make.engineer(building["id"], max_workload=1)

    assert make.ticket(employee, seat["id"])["assigned_to_id"] == engineer["id"]
    assert make.ticket(employee, seat["id"])["assigned_to_id"] is None


def test_deactivated_engineer_users_are_skipped(client, admin, employee, make):
    building, _, seat = make.location()
    user, _, _ = make.engineer(building["id"])
    client.put(f"/users/deactive/{user['id']}", headers=admin)

    assert make.ticket(employee, seat["id"])["assigned_to_id"] is None


def test_employee_tickets_are_always_their_own_and_open(client, employee, make):
    building, _, seat = make.location()
    make.engineer(building["id"])
    # An employee trying to set another reporter, a status and an engineer
    ticket = make.ticket(employee, seat["id"], created_by_id=5, status="Closed", assigned_to_id=1)
    assert ticket["created_by_id"] == 2
    assert ticket["status"] == "Open"
    assert ticket["assigned_to_id"] != 1


def test_admin_can_report_for_someone_else(client, admin, make):
    _, _, seat = make.location()
    ticket = make.ticket(admin, seat["id"], created_by_id=3)
    assert ticket["created_by_id"] == 3


def test_cannot_create_tickets_on_deactivated_locations(client, admin, employee, make):
    building, floor, seat = make.location()

    client.put(f"/seats/deactive/{seat['id']}", headers=admin)
    response = client.post("/tickets", headers=employee, json={
        "title": "x", "description": "x", "status": "Open", "priority": "Low", "created_by_id": 2, "location_id": seat["id"],
    })
    assert response.status_code == 400
    assert "deactivated" in response.json()["detail"]

    other_seat = make.seat(floor["id"])
    client.put(f"/buildings/deactive/{building['id']}", headers=admin)
    response = client.post("/tickets", headers=employee, json={
        "title": "x", "description": "x", "status": "Open", "priority": "Low", "created_by_id": 2, "location_id": other_seat["id"],
    })
    assert response.status_code == 400


# --- Updating tickets ------------------------------------------------------

def test_status_changes_stamp_opened_and_closed_times(client, admin, employee, make):
    _, _, seat = make.location()
    ticket = make.ticket(employee, seat["id"])
    created = get_ticket(client, admin, ticket["id"])
    assert created["opened_at"] is None and created["closed_at"] is None

    client.put(f"/tickets/{ticket['id']}", headers=admin, json=update_payload(created, status="In-Progress"))
    in_progress = get_ticket(client, admin, ticket["id"])
    assert in_progress["opened_at"] is not None
    assert in_progress["closed_at"] is None

    client.put(f"/tickets/{ticket['id']}", headers=admin, json=update_payload(in_progress, status="Closed"))
    closed = get_ticket(client, admin, ticket["id"])
    assert closed["closed_at"] is not None
    assert closed["opened_at"] == in_progress["opened_at"]  # first acknowledgement is kept

    client.put(f"/tickets/{ticket['id']}", headers=admin, json=update_payload(closed, status="In-Progress"))
    reopened = get_ticket(client, admin, ticket["id"])
    assert reopened["closed_at"] is None


def test_update_keeps_issue_type_and_validates_it(client, admin, employee, make):
    _, _, seat = make.location(department="Network")
    ticket = get_ticket(client, admin, make.ticket(employee, seat["id"])["id"])

    client.put(f"/tickets/{ticket['id']}", headers=admin, json=update_payload(ticket, priority="Critical"))
    assert get_ticket(client, admin, ticket["id"])["issue_type"] == "Network"

    bad = client.put(f"/tickets/{ticket['id']}", headers=admin, json=update_payload(ticket, issue_type="Banana"))
    assert bad.status_code == 422


def test_only_admins_can_update_tickets(client, admin, employee, make):
    _, _, seat = make.location()
    ticket = get_ticket(client, admin, make.ticket(employee, seat["id"])["id"])
    response = client.put(f"/tickets/{ticket['id']}", headers=employee, json=update_payload(ticket, status="Closed"))
    assert response.status_code == 403
