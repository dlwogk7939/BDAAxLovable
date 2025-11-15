from fastapi import APIRouter, Depends
from uuid import uuid4
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Drink, Session as DbSession
from ..schemas import DrinkCreate
from ..services.bac_engine import compute_bac

router = APIRouter()

@router.post("/drinks/add")
def add_drink(payload: DrinkCreate, db: Session = Depends(get_db)):
    session = db.query(DbSession).filter_by(id=payload.session_id).first()
    if not session:
        return {"error": "session not found"}

    alcohol_ml = payload.volume_ml * (payload.abv_percent / 100)
    alcohol_grams = alcohol_ml * 0.789

    drink = Drink(
        id=str(uuid4()),
        session_id=payload.session_id,
        volume_ml=payload.volume_ml,
        abv_percent=payload.abv_percent,
        alcohol_grams=alcohol_grams,
    )

    db.add(drink)
    db.commit()

    drinks = session.drinks
    hydration = session.hydration
    snacks = session.snacks

    bac_info = compute_bac(session, drinks, hydration, snacks)
    return bac_info
