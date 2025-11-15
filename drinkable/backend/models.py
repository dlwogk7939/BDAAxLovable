from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    weight_kg = Column(Float, default=70)
    body_ratio = Column(Float, default=0.68)

    sessions = relationship("Session", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    start_time = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    drinks = relationship("Drink")
    hydration = relationship("Hydration")
    snacks = relationship("Snack")


class Drink(Base):
    __tablename__ = "drinks"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    volume_ml = Column(Float)
    abv_percent = Column(Float)
    alcohol_grams = Column(Float)


class Hydration(Base):
    __tablename__ = "hydration"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    volume_ml = Column(Float)


class Snack(Base):
    __tablename__ = "snacks"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    snack_type = Column(String)
    modifier = Column(Float)
