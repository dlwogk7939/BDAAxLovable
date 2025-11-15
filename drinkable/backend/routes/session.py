from fastapi import APIRouter, Depends
from uuid import uuid4
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Session as DbSession
from ..schemas import SessionCreate

router = APIRouter()

@router.post("/session/start")
def start_session(payload: SessionCreate, db: Session = Depends(get_db)):
    # Create user if not exists
    user = db.query(User).filter_by(id=payload.user_id).first()
    if not user:
        user = User(id=payload.user_id)
        db.add(user)
        db.commit()

    session = DbSession(id=str(uuid4()), user_id=payload.user_id)
    db.add(session)
    db.commit()

    return {"session_id": session.id}
