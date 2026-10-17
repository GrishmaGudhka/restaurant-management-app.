import os

os.environ["DATABASE_URL"] = "sqlite:///./test_restaurant.db"  # must be set before the app is imported

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def users(client):
    """Creates one admin, one staff and one kitchen user; returns their auth headers."""
    r = client.post("/auth/setup", json={"username": "boss", "password": "secret123"})
    admin = {"Authorization": f"Bearer {r.json()['access_token']}"}
    headers = {"admin": admin}
    for name, role in (("ravi", "staff"), ("chef", "kitchen")):
        client.post("/auth/users", json={"username": name, "password": "secret123", "role": role}, headers=admin)
        t = client.post("/auth/login", data={"username": name, "password": "secret123"}).json()["access_token"]
        headers[role] = {"Authorization": f"Bearer {t}"}
    return headers


@pytest.fixture()
def floor(client, users):
    """A table (#1) and a menu item (id 1) ready to order."""
    client.post("/tables/", json={"number": 1, "capacity": 4}, headers=users["admin"])
    client.post("/menu/", json={"name": "Paneer Tikka", "category": "Starters", "price": 220}, headers=users["admin"])
    return users
