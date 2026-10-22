from conftest import ADMIN, PASSWORD, login


# --- Login -----------------------------------------------------------------

def test_login_returns_token_with_role(client):
    response = client.post("/auth/token", data={"username": ADMIN[0], "password": ADMIN[1]})
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"


def test_login_rejects_wrong_password(client):
    response = client.post("/auth/token", data={"username": ADMIN[0], "password": "wrong-password"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_routes_require_login(client):
    assert client.get("/tickets").status_code == 401
    assert client.get("/tickets", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


# --- Register --------------------------------------------------------------

def test_register_lowercases_email_and_hides_password(client, admin):
    response = client.post("/auth/register", headers=admin, json={
        "name": "Casey Morgan", "email": "Casey.Morgan@ACME.inc", "role": "Employee", "hashed_password": PASSWORD,
    })
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "casey.morgan@acme.inc"
    assert body["is_active"] is True
    assert "hashed_password" not in body
    login(client, "casey.morgan@acme.inc", PASSWORD)


def test_register_rejects_non_acme_email(client, admin):
    response = client.post("/auth/register", headers=admin, json={
        "name": "Outsider", "email": "someone@gmail.com", "role": "Employee", "hashed_password": PASSWORD,
    })
    assert response.status_code == 422
    assert "acme.inc" in response.text


def test_register_rejects_duplicate_email(client, admin):
    response = client.post("/auth/register", headers=admin, json={
        "name": "Ben Again", "email": "ben.carter@acme.inc", "role": "Employee", "hashed_password": PASSWORD,
    })
    assert response.status_code == 400
    assert "already taken" in response.json()["detail"]


def test_register_rejects_short_password_and_long_name(client, admin):
    short = client.post("/auth/register", headers=admin, json={
        "name": "Short Pass", "email": "short.pass@acme.inc", "role": "Employee", "hashed_password": "abc",
    })
    long_name = client.post("/auth/register", headers=admin, json={
        "name": "N" * 26, "email": "long.name@acme.inc", "role": "Employee", "hashed_password": PASSWORD,
    })
    assert short.status_code == 422
    assert long_name.status_code == 422


def test_only_admins_can_register_users(client, employee):
    response = client.post("/auth/register", headers=employee, json={
        "name": "Sneaky", "email": "sneaky@acme.inc", "role": "Facility Admin", "hashed_password": PASSWORD,
    })
    assert response.status_code == 403


# --- Sign-up (public) ------------------------------------------------------

def test_signup_creates_employee_who_can_log_in(client):
    response = client.post("/auth/signup", json={"name": "Dana Lee", "email": "Dana.Lee@acme.inc", "password": PASSWORD})
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "Employee"
    assert body["email"] == "dana.lee@acme.inc"
    assert "hashed_password" not in body
    login(client, "dana.lee@acme.inc", PASSWORD)


def test_signup_cannot_choose_a_role(client):
    response = client.post("/auth/signup", json={
        "name": "Wannabe Admin", "email": "wannabe.admin@acme.inc", "password": PASSWORD, "role": "Facility Admin",
    })
    assert response.status_code == 201
    assert response.json()["role"] == "Employee"


def test_signup_validates_email_password_and_duplicates(client):
    outsider = client.post("/auth/signup", json={"name": "Outsider", "email": "me@gmail.com", "password": PASSWORD})
    short = client.post("/auth/signup", json={"name": "Shorty", "email": "shorty@acme.inc", "password": "abc"})
    taken = client.post("/auth/signup", json={"name": "Ben Again", "email": "ben.carter@acme.inc", "password": PASSWORD})
    assert outsider.status_code == 422
    assert short.status_code == 422
    assert taken.status_code == 400


def test_signup_rejects_blank_name_and_password(client):
    blank_name = client.post("/auth/signup", json={"name": "     ", "email": "blank.name@acme.inc", "password": PASSWORD})
    blank_password = client.post("/auth/signup", json={"name": "Blank Pass", "email": "blank.pass@acme.inc", "password": " " * 10})
    assert blank_name.status_code == 422
    assert "spaces" in blank_name.text
    assert blank_password.status_code == 422
    assert "can't contain spaces" in blank_password.text


def test_password_cannot_contain_spaces(client, admin):
    signup = client.post("/auth/signup", json={"name": "Space Pass", "email": "space.pass@acme.inc", "password": "my secret pass"})
    register = client.post("/auth/register", headers=admin, json={
        "name": "Tab Pass", "email": "tab.pass@acme.inc", "role": "Employee", "hashed_password": "Secret\tPass123",
    })
    assert signup.status_code == 422
    assert "can't contain spaces" in signup.text
    assert register.status_code == 422


def test_password_needs_letters_numbers_and_special_characters(client, admin):
    cases = {
        "abcdefgh!": "a number",
        "12345678!": "a letter",
        "Password123": "a special character",
        "abcdefghij": "a number and a special character",
    }
    for n, (password, message) in enumerate(cases.items()):
        response = client.post("/auth/signup", json={"name": "Weak Pass", "email": f"weak.pass{n}@acme.inc", "password": password})
        assert response.status_code == 422, password
        assert f"Password needs {message}" in response.text, response.text

    register = client.post("/auth/register", headers=admin, json={
        "name": "Weak Admin Pass", "email": "weak.admin.pass@acme.inc", "role": "Employee", "hashed_password": "onlyletters",
    })
    assert register.status_code == 422

    ok = client.post("/auth/signup", json={"name": "Strong Pass", "email": "strong.pass@acme.inc", "password": "Good#Pass9"})
    assert ok.status_code == 201


def test_signup_trims_and_collapses_name_spaces(client):
    response = client.post("/auth/signup", json={"name": "   Ana    Ruiz  ", "email": "ana.ruiz@acme.inc", "password": PASSWORD})
    assert response.status_code == 201
    assert response.json()["name"] == "Ana Ruiz"


def test_register_rejects_blank_name_and_password(client, admin):
    blank_name = client.post("/auth/register", headers=admin, json={
        "name": "  ", "email": "blank.admin.name@acme.inc", "role": "Employee", "hashed_password": PASSWORD,
    })
    blank_password = client.post("/auth/register", headers=admin, json={
        "name": "Blank Admin Pass", "email": "blank.admin.pass@acme.inc", "role": "Employee", "hashed_password": " " * 12,
    })
    assert blank_name.status_code == 422
    assert blank_password.status_code == 422


# --- Users -----------------------------------------------------------------

def test_user_list_includes_status_but_not_passwords(client, admin):
    users = client.get("/users", headers=admin).json()
    assert len(users) >= 20
    assert all("is_active" in u and "hashed_password" not in u for u in users)


def test_deactivated_user_cannot_log_in_and_is_signed_out(client, admin, make):
    user = make.user()
    headers = login(client, user["email"], PASSWORD)

    response = client.put(f"/users/deactive/{user['id']}", headers=admin)
    assert response.status_code == 202
    assert response.json()["is_active"] is False
    assert "hashed_password" not in response.json()

    assert client.get("/tickets", headers=headers).status_code == 401
    blocked = client.post("/auth/token", data={"username": user["email"], "password": PASSWORD})
    assert blocked.status_code == 403
    assert "deactivated" in blocked.json()["detail"]


def test_reactivated_user_can_log_in_again(client, admin, make):
    user = make.user()
    client.put(f"/users/deactive/{user['id']}", headers=admin)

    response = client.put(f"/users/active/{user['id']}", headers=admin)
    assert response.status_code == 202
    assert response.json()["is_active"] is True
    login(client, user["email"], PASSWORD)


def test_admin_cannot_deactivate_own_account(client, admin):
    me = next(u for u in client.get("/users", headers=admin).json() if u["email"] == ADMIN[0])
    response = client.put(f"/users/deactive/{me['id']}", headers=admin)
    assert response.status_code == 400


def test_deactivate_unknown_user_is_404(client, admin):
    assert client.put("/users/deactive/999999", headers=admin).status_code == 404


def test_only_admins_can_deactivate_users(client, employee, make):
    user = make.user()
    assert client.put(f"/users/deactive/{user['id']}", headers=employee).status_code == 403
