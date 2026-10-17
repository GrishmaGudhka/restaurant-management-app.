def order_body(note=None):
    return {"table_id": 1, "items": [{"menu_item_id": 1, "quantity": 2, "note": note}]}


def test_setup_runs_once(client):
    assert client.get("/auth/setup-status").json() == {"needs_setup": True}
    r = client.post("/auth/setup", json={"username": "boss", "password": "secret123"})
    assert r.status_code == 201 and r.json()["role"] == "admin"
    assert client.get("/auth/setup-status").json() == {"needs_setup": False}
    assert client.post("/auth/setup", json={"username": "evil", "password": "secret123"}).status_code == 403


def test_everything_requires_login(client):
    for path in ("/tables/", "/menu/", "/orders/"):
        assert client.get(path).status_code == 401


def test_only_admin_manages_team(client, users):
    assert client.get("/auth/users", headers=users["staff"]).status_code == 403
    assert client.get("/auth/users", headers=users["admin"]).status_code == 200
    r = client.patch("/auth/users/2", json={"is_active": False}, headers=users["admin"])
    assert r.status_code == 200
    assert client.post("/auth/login", data={"username": "ravi", "password": "secret123"}).status_code == 403
    assert client.get("/tables/", headers=users["staff"]).status_code == 401  # old token stops working


def test_table_rights(client, users):
    body = {"number": 1, "capacity": 4}
    assert client.post("/tables/", json=body, headers=users["staff"]).status_code == 403
    assert client.post("/tables/", json=body, headers=users["kitchen"]).status_code == 403
    assert client.post("/tables/", json=body, headers=users["admin"]).status_code == 201
    assert client.post("/tables/", json=body, headers=users["admin"]).status_code == 400  # duplicate number
    # staff can reserve in one step; kitchen can't touch the floor
    assert client.patch("/tables/1/status", json={"status": "reserved"}, headers=users["staff"]).json()["status"] == "reserved"
    assert client.patch("/tables/1/status", json={"status": "occupied"}, headers=users["kitchen"]).status_code == 403
    assert client.delete("/tables/1", headers=users["staff"]).status_code == 403


def test_table_delete_is_soft_and_guarded(client, floor):
    client.post("/orders/", json=order_body(), headers=floor["staff"])
    assert client.delete("/tables/1", headers=floor["admin"]).status_code == 400  # open ticket
    assert client.patch("/tables/1/status", json={"status": "free"}, headers=floor["staff"]).status_code == 400
    for status, who in (("preparing", "kitchen"), ("ready", "kitchen"), ("served", "staff"), ("closed", "staff")):
        assert client.patch("/orders/1/status", json={"status": status}, headers=floor[who]).status_code == 200
    assert client.get("/tables/", headers=floor["admin"]).json()[0]["status"] == "free"  # freed automatically
    assert client.delete("/tables/1", headers=floor["admin"]).status_code == 204
    assert client.get("/tables/", headers=floor["admin"]).json() == []
    assert client.get("/orders/1", headers=floor["admin"]).status_code == 200  # history survives
    # the number can be reused after deletion
    assert client.post("/tables/", json={"number": 1, "capacity": 2}, headers=floor["admin"]).status_code == 201


def test_order_flow_and_roles(client, floor):
    assert client.post("/orders/", json=order_body(), headers=floor["kitchen"]).status_code == 403
    r = client.post("/orders/", json=order_body("no onion"), headers=floor["staff"])
    assert r.status_code == 201
    o = r.json()
    assert o["created_by_name"] == "ravi" and o["table_number"] == 1 and o["total"] == 440
    assert o["items"][0]["note"] == "no onion" and o["created_at"].endswith("Z")
    assert client.get("/tables/", headers=floor["staff"]).json()[0]["status"] == "occupied"

    move = lambda s, who: client.patch("/orders/1/status", json={"status": s}, headers=floor[who]).status_code
    assert move("preparing", "staff") == 403      # staff can't cook
    assert move("ready", "kitchen") == 400        # no skipping steps
    assert move("preparing", "kitchen") == 200
    assert move("cancelled", "staff") == 403      # too late for staff to void
    assert move("ready", "kitchen") == 200
    assert move("served", "kitchen") == 403       # kitchen doesn't serve
    assert move("served", "staff") == 200
    assert move("closed", "kitchen") == 403       # kitchen doesn't take payment
    assert move("closed", "staff") == 200
    assert move("preparing", "admin") == 400      # closed is final


def test_table_stays_busy_until_last_ticket_closes(client, floor):
    client.post("/orders/", json=order_body(), headers=floor["staff"])
    client.post("/orders/", json=order_body(), headers=floor["staff"])
    assert client.patch("/orders/1/status", json={"status": "cancelled"}, headers=floor["staff"]).status_code == 200
    assert client.get("/tables/", headers=floor["staff"]).json()[0]["status"] == "occupied"
    assert client.patch("/orders/2/status", json={"status": "cancelled"}, headers=floor["staff"]).status_code == 200
    assert client.get("/tables/", headers=floor["staff"]).json()[0]["status"] == "free"
    assert len(client.get("/orders/?scope=history", headers=floor["staff"]).json()) == 2
    assert client.get("/orders/?scope=active", headers=floor["staff"]).json() == []


def test_menu_rights_sold_out_and_archive(client, floor):
    item = {"name": "Naan", "category": "Breads", "price": 40}
    assert client.post("/menu/", json=item, headers=floor["staff"]).status_code == 403
    assert client.patch("/menu/1/availability", json={"is_available": False}, headers=floor["staff"]).status_code == 403
    assert client.patch("/menu/1/availability", json={"is_available": False}, headers=floor["kitchen"]).status_code == 200
    assert client.post("/orders/", json=order_body(), headers=floor["staff"]).status_code == 400  # sold out
    client.patch("/menu/1/availability", json={"is_available": True}, headers=floor["admin"])
    client.post("/orders/", json=order_body(), headers=floor["staff"])
    assert client.delete("/menu/1", headers=floor["admin"]).status_code == 204
    assert client.get("/menu/", headers=floor["admin"]).json() == []
    assert client.get("/orders/1", headers=floor["admin"]).status_code == 200  # old order still loads
