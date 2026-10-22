def add_note(client, headers, ticket_id, body="Test note"):
    return client.post("/notes", headers=headers, json={"ticket_id": ticket_id, "body": body})


def test_employee_can_note_their_own_ticket(client, employee, make):
    _, _, seat = make.location()
    ticket = make.ticket(employee, seat["id"])

    response = add_note(client, employee, ticket["id"])
    assert response.status_code == 201
    note = response.json()
    assert note["author_id"] == 2
    assert note["engineer_id"] is None


def test_employee_cannot_note_someone_elses_ticket(client, employee, other_employee, make):
    _, _, seat = make.location()
    ticket = make.ticket(other_employee, seat["id"])

    response = add_note(client, employee, ticket["id"])
    assert response.status_code == 403


def test_assigned_engineer_notes_are_linked_to_their_profile(client, employee, make):
    building, _, seat = make.location()
    user, engineer, engineer_headers = make.engineer(building["id"])
    ticket = make.ticket(employee, seat["id"])
    assert ticket["assigned_to_id"] == engineer["id"]

    response = add_note(client, engineer_headers, ticket["id"])
    assert response.status_code == 201
    assert response.json()["author_id"] == user["id"]
    assert response.json()["engineer_id"] == engineer["id"]


def test_engineer_cannot_note_tickets_assigned_to_others(client, employee, engineer, make):
    _, _, seat = make.location()
    ticket = make.ticket(employee, seat["id"])  # not in Liam's building

    assert add_note(client, engineer, ticket["id"]).status_code == 403


def test_admin_can_note_any_ticket(client, admin, other_employee, make):
    _, _, seat = make.location()
    ticket = make.ticket(other_employee, seat["id"])

    response = add_note(client, admin, ticket["id"])
    assert response.status_code == 201
    assert response.json()["engineer_id"] is None


def test_author_comes_from_login_not_the_request(client, employee, make):
    _, _, seat = make.location()
    ticket = make.ticket(employee, seat["id"])

    response = client.post("/notes", headers=employee, json={
        "ticket_id": ticket["id"], "body": "Spoofed", "author_id": 1, "engineer_id": 1,
    })
    assert response.status_code == 201
    assert response.json()["author_id"] == 2
    assert response.json()["engineer_id"] is None


def test_note_on_missing_ticket_is_404(client, admin):
    assert add_note(client, admin, 999999).status_code == 404


def test_empty_note_is_rejected(client, employee, make):
    _, _, seat = make.location()
    ticket = make.ticket(employee, seat["id"])
    assert add_note(client, employee, ticket["id"], body="").status_code == 422


def test_admin_can_edit_note_body(client, admin, employee, make):
    _, _, seat = make.location()
    ticket = make.ticket(employee, seat["id"])
    note = add_note(client, employee, ticket["id"], body="Before").json()

    response = client.put(f"/notes/{note['id']}", headers=admin, json={"body": "After"})
    assert response.status_code == 202
    assert client.get(f"/notes/{note['id']}", headers=admin).json()["body"] == "After"
