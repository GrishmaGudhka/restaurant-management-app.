from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import menu, table, order, auth

# Import all models so Base.metadata knows about every table before create_all runs
from app.models import user, menu as menu_model, table as table_model, order as order_model  # noqa: F401

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Restaurant Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(menu.router)
app.include_router(table.router)
app.include_router(order.router)


@app.get("/")
def read_root():
    return {"message": "Restaurant Management API is running"}
