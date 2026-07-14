import random
import string
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .database import create_db_and_tables, get_session
from .models import (
    Activity,
    ActivityCreate,
    ActivityRead,
    Checkpoint,
    CheckpointCreate,
    CheckpointRead,
    Participant,
    ParticipantJoin,
    ParticipantRead,
)


def generate_room_code(session: Session, length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits

    for _ in range(20):
        code = "".join(random.choices(alphabet, k=length))
        existing = session.exec(
            select(Activity).where(Activity.code == code)
        ).first()
        if existing is None:
            return code

    raise RuntimeError("Could not generate a unique room code")


def get_activity_or_404(code: str, session: Session) -> Activity:
    activity = session.exec(
        select(Activity).where(Activity.code == code.upper())
    ).first()

    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")

    return activity


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="Outdoor Activity API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(
    "/activities",
    response_model=ActivityRead,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    data: ActivityCreate,
    session: Session = Depends(get_session),
):
    activity = Activity(
        title=data.title.strip(),
        description=data.description.strip(),
        code=generate_room_code(session),
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)

    host = Participant(
        activity_id=activity.id,
        name=data.creator_name.strip(),
        is_host=True,
    )
    session.add(host)
    session.commit()

    return activity


@app.get("/activities/{code}", response_model=ActivityRead)
def get_activity(
    code: str,
    session: Session = Depends(get_session),
):
    return get_activity_or_404(code, session)


@app.post(
    "/activities/{code}/join",
    response_model=ParticipantRead,
    status_code=status.HTTP_201_CREATED,
)
def join_activity(
    code: str,
    data: ParticipantJoin,
    session: Session = Depends(get_session),
):
    activity = get_activity_or_404(code, session)

    participant = Participant(
        activity_id=activity.id,
        name=data.name.strip(),
        is_host=False,
    )
    session.add(participant)
    session.commit()
    session.refresh(participant)

    return participant


@app.get(
    "/activities/{code}/participants",
    response_model=list[ParticipantRead],
)
def list_participants(
    code: str,
    session: Session = Depends(get_session),
):
    activity = get_activity_or_404(code, session)

    return session.exec(
        select(Participant)
        .where(Participant.activity_id == activity.id)
        .order_by(Participant.joined_at)
    ).all()


@app.post(
    "/activities/{code}/checkpoints",
    response_model=CheckpointRead,
    status_code=status.HTTP_201_CREATED,
)
def create_checkpoint(
    code: str,
    data: CheckpointCreate,
    session: Session = Depends(get_session),
):
    activity = get_activity_or_404(code, session)

    checkpoint = Checkpoint(
        activity_id=activity.id,
        title=data.title.strip(),
        description=data.description.strip(),
        latitude=data.latitude,
        longitude=data.longitude,
        order_index=data.order_index,
    )
    session.add(checkpoint)
    session.commit()
    session.refresh(checkpoint)

    return checkpoint


@app.get(
    "/activities/{code}/checkpoints",
    response_model=list[CheckpointRead],
)
def list_checkpoints(
    code: str,
    session: Session = Depends(get_session),
):
    activity = get_activity_or_404(code, session)

    return session.exec(
        select(Checkpoint)
        .where(Checkpoint.activity_id == activity.id)
        .order_by(Checkpoint.order_index, Checkpoint.id)
    ).all()
