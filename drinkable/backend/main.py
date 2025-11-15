from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import drinks, hydration, snacks, session, gpt
from .database import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # change later for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(drinks.router, prefix="/api")
app.include_router(hydration.router, prefix="/api")
app.include_router(snacks.router, prefix="/api")
app.include_router(session.router, prefix="/api")
app.include_router(gpt.router, prefix="/api")
