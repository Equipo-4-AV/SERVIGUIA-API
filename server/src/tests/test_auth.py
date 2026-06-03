import pytest
from fastapi.testclient import TestClient


REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
REFRESH_URL = "/api/auth/refresh"
LOGOUT_URL = "/api/auth/logout"
KICKOFF_URL = "/api/kickoff"


# --- helpers ---

def register_and_login(client: TestClient, email: str, password: str) -> dict:
    client.post(REGISTER_URL, json={"email": email, "password": password})
    res = client.post(LOGIN_URL, json={"email": email, "password": password})
    return res.json()


# --- register ---

def test_register_creates_user(client: TestClient):
    res = client.post(REGISTER_URL, json={"email": "new@test.com", "password": "pass123"})
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new@test.com"
    assert "id" in data


def test_register_duplicate_email_returns_409(client: TestClient):
    payload = {"email": "dupe@test.com", "password": "pass123"}
    client.post(REGISTER_URL, json=payload)
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 409


# --- login ---

def test_login_returns_access_and_refresh_tokens(client: TestClient):
    payload = {"email": "login@test.com", "password": "pass123"}
    client.post(REGISTER_URL, json=payload)

    res = client.post(LOGIN_URL, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password_returns_401(client: TestClient):
    client.post(REGISTER_URL, json={"email": "wrongpass@test.com", "password": "correct"})
    res = client.post(LOGIN_URL, json={"email": "wrongpass@test.com", "password": "wrong"})
    assert res.status_code == 401


# --- protected endpoint (kickoff) ---

def test_kickoff_without_token_returns_401(client: TestClient):
    res = client.post(KICKOFF_URL)
    assert res.status_code == 401


def test_kickoff_with_valid_token_succeeds(client: TestClient):
    tokens = register_and_login(client, "kickoff@test.com", "pass123")
    res = client.post(KICKOFF_URL, headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert res.status_code == 200
    assert "task_id" in res.json()


def test_kickoff_with_invalid_token_returns_401(client: TestClient):
    res = client.post(KICKOFF_URL, headers={"Authorization": "Bearer token_inventado"})
    assert res.status_code == 401


# --- refresh & logout ---

def test_refresh_with_valid_token_returns_new_access_token(client: TestClient):
    tokens = register_and_login(client, "refresh@test.com", "pass123")
    res = client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_logout_then_refresh_returns_401(client: TestClient):
    tokens = register_and_login(client, "logout@test.com", "pass123")
    refresh_token = tokens["refresh_token"]

    logout_res = client.post(LOGOUT_URL, json={"refresh_token": refresh_token})
    assert logout_res.status_code == 200

    res = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
    assert res.status_code == 401
