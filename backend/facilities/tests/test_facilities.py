def ids(items):
    return {item["id"] for item in items}


# --- Buildings -------------------------------------------------------------

def test_seeded_buildings_have_departments(client, employee):
    buildings = {b["name"]: b for b in client.get("/buildings", headers=employee).json()}
    assert buildings["HQ Tower"]["department"] == "Software"
    assert buildings["Riverside Office"]["department"] == "Hardware"
    assert buildings["Riverside Office"]["is_active"] is True


def test_create_and_edit_building(client, admin, make):
    building = make.building(department="Network")
    assert building["id"] and building["is_active"] is True

    response = client.put(f"/buildings/{building['id']}", headers=admin,
                          json={"name": "Renamed Tower", "address": "9 New Road", "department": "Structural"})
    assert response.status_code == 202
    assert response.json()["department"] == "Structural"


def test_building_validation(client, admin):
    long_name = client.post("/buildings", headers=admin, json={"name": "B" * 26, "address": "1 Long Street"})
    bad_department = client.post("/buildings", headers=admin, json={"name": "Odd", "address": "1 Odd Street", "department": "Catering"})
    assert long_name.status_code == 422
    assert bad_department.status_code == 422


def test_edit_unknown_building_is_404(client, admin):
    response = client.put("/buildings/999999", headers=admin, json={"name": "Nowhere", "address": "0 Nowhere"})
    assert response.status_code == 404


def test_deactivated_buildings_are_hidden_unless_requested(client, admin, make):
    building = make.building()
    client.put(f"/buildings/deactive/{building['id']}", headers=admin)

    assert building["id"] not in ids(client.get("/buildings", headers=admin).json())
    listed = client.get("/buildings", headers=admin, params={"include_inactive": True}).json()
    assert next(b for b in listed if b["id"] == building["id"])["is_active"] is False

    client.put(f"/buildings/active/{building['id']}", headers=admin)
    assert building["id"] in ids(client.get("/buildings", headers=admin).json())


def test_only_admins_can_manage_facilities(client, employee, make):
    building = make.building()
    assert client.post("/buildings", headers=employee, json={"name": "Mine", "address": "1 My Street"}).status_code == 403
    assert client.post("/floors", headers=employee, json={"building_id": building["id"], "floor_number": 1, "capacity": 5}).status_code == 403
    assert client.put(f"/buildings/deactive/{building['id']}", headers=employee).status_code == 403


# --- Floors ----------------------------------------------------------------

def test_duplicate_floor_numbers_are_rejected(client, admin, make):
    building = make.building()
    make.floor(building["id"], floor_number=1)
    second = make.floor(building["id"], floor_number=2)

    duplicate = client.post("/floors", headers=admin, json={"building_id": building["id"], "floor_number": 1, "capacity": 5})
    assert duplicate.status_code == 400

    renumbered = client.put(f"/floors/{second['id']}", headers=admin,
                            json={"building_id": building["id"], "floor_number": 1, "capacity": 5})
    assert renumbered.status_code == 400


def test_floor_capacity_cannot_drop_below_active_seats(client, admin, make):
    building = make.building()
    floor = make.floor(building["id"], capacity=5)
    make.seat(floor["id"])
    make.seat(floor["id"])

    too_low = client.put(f"/floors/{floor['id']}", headers=admin, json={"building_id": building["id"], "floor_number": 1, "capacity": 1})
    assert too_low.status_code == 400
    enough = client.put(f"/floors/{floor['id']}", headers=admin, json={"building_id": building["id"], "floor_number": 1, "capacity": 2})
    assert enough.status_code == 202


def test_floor_capacity_range_is_validated(client, admin, make):
    building = make.building()
    response = client.post("/floors", headers=admin, json={"building_id": building["id"], "floor_number": 1, "capacity": 0})
    assert response.status_code == 422


# --- Seats -----------------------------------------------------------------

def test_cannot_add_seats_past_capacity(client, admin, make):
    building = make.building()
    floor = make.floor(building["id"], capacity=2)
    make.seat(floor["id"])
    make.seat(floor["id"], seat_type="Meeting Room")

    response = client.post("/seats", headers=admin, json={"floor_id": floor["id"], "seat_type": "Desk"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Floor 1 is at capacity (2 of 2 seats)"


def test_deactivated_seat_frees_space_but_cannot_return_to_a_full_floor(client, admin, make):
    building = make.building()
    floor = make.floor(building["id"], capacity=1)
    first = make.seat(floor["id"])

    client.put(f"/seats/deactive/{first['id']}", headers=admin)
    make.seat(floor["id"])  # takes the freed space

    response = client.put(f"/seats/active/{first['id']}", headers=admin)
    assert response.status_code == 400
    assert "capacity" in response.json()["detail"]


def test_cannot_add_seats_to_deactivated_floor(client, admin, make):
    building = make.building()
    floor = make.floor(building["id"])
    client.put(f"/floors/deactive/{floor['id']}", headers=admin)

    response = client.post("/seats", headers=admin, json={"floor_id": floor["id"], "seat_type": "Desk"})
    assert response.status_code == 400


def test_seat_type_is_validated_and_editable(client, admin, make):
    building = make.building()
    floor = make.floor(building["id"])
    seat = make.seat(floor["id"])

    bad = client.post("/seats", headers=admin, json={"floor_id": floor["id"], "seat_type": "Sofa"})
    assert bad.status_code == 422

    edited = client.put(f"/seats/{seat['id']}", headers=admin, json={"floor_id": floor["id"], "seat_type": "Common Area"})
    assert edited.status_code == 202
    assert edited.json()["seat_type"] == "Common Area"


def test_deactivated_seats_are_listed_only_on_request(client, admin, make):
    building = make.building()
    floor = make.floor(building["id"])
    seat = make.seat(floor["id"])
    client.put(f"/seats/deactive/{seat['id']}", headers=admin)

    assert seat["id"] not in ids(client.get("/seats", headers=admin).json())
    assert seat["id"] in ids(client.get("/seats", headers=admin, params={"include_inactive": True}).json())
