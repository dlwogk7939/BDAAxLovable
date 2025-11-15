from fastapi import APIRouter, Depends
from uuid import uuid4
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Snack, Session as DbSession
from ..schemas import SnackCreate
from ..services.bac_engine import compute_bac

router = APIRouter()

@router.post("/snacks/add")
def add_snack(payload: SnackCreate, db: Session = Depends(get_db)):
    session = db.query(DbSession).filter_by(id=payload.session_id).first()
    if not session:
        return {"error": "session not found"}

    snack = Snack(
        id=str(uuid4()),
        session_id=payload.session_id,
        snack_type=payload.snack_type,
        modifier=payload.modifier,
    )

    db.add(snack)
    db.commit()

    bac_info = compute_bac(session, session.drinks, session.hydration, session.snacks)
    return bac_info
