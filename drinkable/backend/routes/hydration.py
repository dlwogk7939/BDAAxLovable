from fastapi import APIRouter, Depends
from uuid import uuid4
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Hydration, Session as DbSession
from ..schemas import HydrationCreate
from ..services.bac_engine import compute_bac

router = APIRouter()

@router.post("/hydration/add")
def add_hydration(payload: HydrationCreate, db: Session = Depends(get_db)):
    session = db.query(DbSession).filter_by(id=payload.session_id).first()
    if not session:
        return {"error": "session not found"}

    hydration = Hydration(
        id=str(uuid4()),
        session_id=payload.session_id,
        volume_ml=payload.volume_ml,
    )

    db.add(hydration)
    db.commit()

    bac_info = compute_bac(session, session.drinks, session.hydration, session.snacks)
    return bac_info
