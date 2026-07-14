from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ActivityBase(SQLModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=1000)


class Activity(ActivityBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, max_length=6)
    created_at: datetime = Field(default_factory=utc_now)


class ActivityCreate(ActivityBase):
    creator_name: str = Field(min_length=2, max_length=60)


class ActivityRead(ActivityBase):
    id: int
    code: str
    created_at: datetime


class Participant(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="activity.id", index=True)
    name: str = Field(min_length=2, max_length=60)
    is_host: bool = False
    joined_at: datetime = Field(default_factory=utc_now)


class ParticipantJoin(SQLModel):
    name: str = Field(min_length=2, max_length=60)


class ParticipantRead(SQLModel):
    id: int
    activity_id: int
    name: str
    is_host: bool
    joined_at: datetime


class Checkpoint(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="activity.id", index=True)
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    latitude: float
    longitude: float
    order_index: int = 0


class CheckpointCreate(SQLModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    latitude: float
    longitude: float
    order_index: int = 0


class CheckpointRead(CheckpointCreate):
    id: int
    activity_id: int
