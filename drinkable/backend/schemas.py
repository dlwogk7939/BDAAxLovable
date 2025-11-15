from pydantic import BaseModel
from datetime import datetime

class SessionCreate(BaseModel):
    user_id: str


class DrinkCreate(BaseModel):
    session_id: str
    volume_ml: float
    abv_percent: float


class HydrationCreate(BaseModel):
    session_id: str
    volume_ml: float


class SnackCreate(BaseModel):
    session_id: str
    snack_type: str
    modifier: float
