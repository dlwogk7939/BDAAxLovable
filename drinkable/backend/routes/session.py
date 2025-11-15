from fastapi import APIRouter, Depends
from uuid import uuid4
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Session as DbSession
from ..schemas import SessionCreate
from ..services.bac_engine import compute_bac

router = APIRouter()

@router.post("/session/start")
def start_session(payload: SessionCreate, db: Session = Depends(get_db)):
    # Create or refresh user profile data
    user = db.query(User).filter_by(id=payload.user_id).first()
    if not user:
        user = User(id=payload.user_id)
        db.add(user)

    if payload.weight_kg is not None:
        user.weight_kg = payload.weight_kg
    if payload.body_ratio is not None:
        user.body_ratio = payload.body_ratio

    session = DbSession(id=str(uuid4()), user_id=payload.user_id)
    db.add(session)
    db.commit()

    return {"session_id": session.id}


@router.get("/session/status")
def get_session_status(session_id: str, db: Session = Depends(get_db)):
    """
    Return current BAC snapshot + counters for the given session.
    """
    session = db.query(DbSession).filter_by(id=session_id).first()
    if not session:
        return {"error": "session not found"}

    bac_info = compute_bac(session, session.drinks, session.hydration, session.snacks)
    return {
        "session_id": session.id,
        "user_id": session.user_id,
        "drink_count": len(session.drinks),
        "hydration_count": len(session.hydration),
        "snack_count": len(session.snacks),
        **bac_info,
    }
