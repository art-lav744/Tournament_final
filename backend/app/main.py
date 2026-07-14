import random
import string
from contextlib import asynccontextmanager
from datetime import timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlmodel import Session, select

from .database import create_db_and_tables, get_session
from .models import (
    Activity,
    ActivityCreate,
    ActivityJoin,
    ActivityRead,
    Checkpoint,
    CheckpointCreate,
    CheckpointRead,
    EventLocation,
    EventMember,
    EventOwner,
    EventParticipantRead,
    FriendConnectionRead,
    FriendLocationRead,
    FriendRequestCreate,
    Friendship,
    LocationSharingUpdate,
    LocationUpdate,
    Participant,
    ParticipantJoin,
    ParticipantRead,
    User,
    UserConnect,
    UserCreate,
    UserLocation,
    UserRead,
    UserUpdate,
    utc_now,
)


def generate_unique_code(
    session: Session,
    model,
    field_name: str,
    length: int,
    alphabet: str,
) -> str:
    field = getattr(model, field_name)

    for _ in range(40):
        code = "".join(random.choices(alphabet, k=length))
        existing = session.exec(select(model).where(field == code)).first()
        if existing is None:
            return code

    raise RuntimeError(f"Could not generate unique {field_name}")


def get_activity_or_404(code: str, session: Session) -> Activity:
    activity = session.exec(
        select(Activity).where(Activity.code == code.upper())
    ).first()
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


def generate_profile_code(session: Session) -> str:
    return generate_unique_code(
        session,
        User,
        "profile_code",
        14,
        string.ascii_uppercase + string.digits,
    )


def ensure_profile_code(user: User, session: Session) -> User:
    if not user.profile_code:
        user.profile_code = generate_profile_code(session)
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def get_user_or_404(user_id: int, session: Session) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return ensure_profile_code(user, session)


def normalized_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="Outdoor Activity API",
    version="0.2.0",
    lifespan=lifespan,
)

# Hackathon-friendly CORS. For production, restrict this to known frontend origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------- Users / friends / live locations --------------------

@app.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, session: Session = Depends(get_session)):
    friend_code = generate_unique_code(
        session,
        User,
        "friend_code",
        8,
        string.ascii_uppercase + string.digits,
    )
    user = User(
        name=data.name.strip(),
        photo_url=(data.photo_url or "").strip() or None,
        friend_code=friend_code,
        profile_code=generate_profile_code(session),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.get("/users/{user_id}", response_model=UserRead)
def get_user(user_id: int, session: Session = Depends(get_session)):
    return get_user_or_404(user_id, session)


@app.post("/users/connect", response_model=UserRead)
def connect_existing_user(
    data: UserConnect,
    session: Session = Depends(get_session),
):
    code = data.profile_code.strip().upper()
    user = session.exec(select(User).where(User.profile_code == code)).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Profile code not found")
    return ensure_profile_code(user, session)


@app.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    data: UserUpdate,
    session: Session = Depends(get_session),
):
    user = get_user_or_404(user_id, session)

    if data.name is not None:
        user.name = data.name.strip()
    if data.photo_url is not None:
        user.photo_url = data.photo_url.strip() or None

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.put("/users/{user_id}/location", response_model=FriendLocationRead)
def update_user_location(
    user_id: int,
    data: LocationUpdate,
    session: Session = Depends(get_session),
):
    user = get_user_or_404(user_id, session)
    if not user.location_sharing_enabled:
        raise HTTPException(status_code=409, detail="Location sharing is disabled")

    location = session.get(UserLocation, user_id)
    now = utc_now()

    if location is None:
        location = UserLocation(
            user_id=user_id,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            updated_at=now,
        )
    else:
        location.latitude = data.latitude
        location.longitude = data.longitude
        location.accuracy = data.accuracy
        location.updated_at = now

    session.add(location)
    session.commit()
    session.refresh(location)

    return FriendLocationRead(
        user_id=user.id,
        name=user.name,
        photo_url=user.photo_url,
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy,
        updated_at=location.updated_at,
        age_seconds=0,
        presence="online",
    )


@app.put("/users/{user_id}/location-sharing", response_model=UserRead)
def set_location_sharing(
    user_id: int,
    data: LocationSharingUpdate,
    session: Session = Depends(get_session),
):
    user = get_user_or_404(user_id, session)
    user.location_sharing_enabled = data.enabled
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.post(
    "/users/{user_id}/friends/request",
    response_model=FriendConnectionRead,
    status_code=status.HTTP_201_CREATED,
)
def send_friend_request(
    user_id: int,
    data: FriendRequestCreate,
    session: Session = Depends(get_session),
):
    requester = get_user_or_404(user_id, session)
    code = data.friend_code.strip().upper()
    addressee = session.exec(select(User).where(User.friend_code == code)).first()

    if addressee is None:
        raise HTTPException(status_code=404, detail="Friend code not found")
    if addressee.id == requester.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself")

    existing = session.exec(
        select(Friendship).where(
            or_(
                (Friendship.requester_id == requester.id)
                & (Friendship.addressee_id == addressee.id),
                (Friendship.requester_id == addressee.id)
                & (Friendship.addressee_id == requester.id),
            )
        )
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Friendship already exists")

    friendship = Friendship(
        requester_id=requester.id,
        addressee_id=addressee.id,
        status="pending",
    )
    session.add(friendship)
    session.commit()
    session.refresh(friendship)

    return FriendConnectionRead(
        friendship_id=friendship.id,
        user_id=addressee.id,
        name=addressee.name,
        photo_url=addressee.photo_url,
        friend_code=addressee.friend_code,
        status=friendship.status,
        direction="outgoing",
        created_at=friendship.created_at,
    )


@app.post(
    "/users/{user_id}/friends/{friendship_id}/accept",
    response_model=FriendConnectionRead,
)
def accept_friend_request(
    user_id: int,
    friendship_id: int,
    session: Session = Depends(get_session),
):
    user = get_user_or_404(user_id, session)
    friendship = session.get(Friendship, friendship_id)

    if friendship is None:
        raise HTTPException(status_code=404, detail="Friend request not found")
    if friendship.addressee_id != user.id:
        raise HTTPException(status_code=403, detail="This request is not addressed to you")
    if friendship.status != "pending":
        raise HTTPException(status_code=409, detail="Friend request is not pending")

    friendship.status = "accepted"
    session.add(friendship)
    session.commit()
    session.refresh(friendship)

    friend = get_user_or_404(friendship.requester_id, session)
    return FriendConnectionRead(
        friendship_id=friendship.id,
        user_id=friend.id,
        name=friend.name,
        photo_url=friend.photo_url,
        friend_code=friend.friend_code,
        status=friendship.status,
        direction="accepted",
        created_at=friendship.created_at,
    )


@app.get("/users/{user_id}/friends", response_model=list[FriendConnectionRead])
def list_friends(user_id: int, session: Session = Depends(get_session)):
    user = get_user_or_404(user_id, session)
    friendships = session.exec(
        select(Friendship)
        .where(
            or_(
                Friendship.requester_id == user.id,
                Friendship.addressee_id == user.id,
            )
        )
        .order_by(Friendship.created_at.desc())
    ).all()

    result: list[FriendConnectionRead] = []
    for friendship in friendships:
        is_requester = friendship.requester_id == user.id
        other_id = friendship.addressee_id if is_requester else friendship.requester_id
        other = session.get(User, other_id)
        if other is None:
            continue

        if friendship.status == "accepted":
            direction = "accepted"
        else:
            direction = "outgoing" if is_requester else "incoming"

        result.append(
            FriendConnectionRead(
                friendship_id=friendship.id,
                user_id=other.id,
                name=other.name,
                photo_url=other.photo_url,
                friend_code=other.friend_code,
                status=friendship.status,
                direction=direction,
                created_at=friendship.created_at,
            )
        )

    return result


@app.get(
    "/users/{user_id}/friends/locations",
    response_model=list[FriendLocationRead],
)
def list_friend_locations(user_id: int, session: Session = Depends(get_session)):
    user = get_user_or_404(user_id, session)
    friendships = session.exec(
        select(Friendship).where(
            (Friendship.status == "accepted")
            & or_(
                Friendship.requester_id == user.id,
                Friendship.addressee_id == user.id,
            )
        )
    ).all()

    now = utc_now()
    result: list[FriendLocationRead] = []

    for friendship in friendships:
        friend_id = (
            friendship.addressee_id
            if friendship.requester_id == user.id
            else friendship.requester_id
        )
        friend = session.get(User, friend_id)
        location = session.get(UserLocation, friend_id)

        if friend is None or location is None or not friend.location_sharing_enabled:
            continue

        age = max(
            0,
            int((now - normalized_utc(location.updated_at)).total_seconds()),
        )

        # Old coordinates are not shown on the live map.
        if age > 300:
            continue

        presence = "online" if age <= 20 else "stale" if age <= 60 else "offline"
        result.append(
            FriendLocationRead(
                user_id=friend.id,
                name=friend.name,
                photo_url=friend.photo_url,
                latitude=location.latitude,
                longitude=location.longitude,
                accuracy=location.accuracy,
                updated_at=location.updated_at,
                age_seconds=age,
                presence=presence,
            )
        )

    return result


# -------------------- Activities --------------------
# -------------------- Activities / events --------------------

def activity_to_read(activity: Activity, session: Session) -> ActivityRead:
    owner = session.get(EventOwner, activity.id)
    location = session.get(EventLocation, activity.id)
    return ActivityRead(
        id=activity.id,
        title=activity.title,
        description=activity.description,
        code=activity.code,
        created_at=activity.created_at,
        host_user_id=owner.user_id if owner else None,
        latitude=location.latitude if location else None,
        longitude=location.longitude if location else None,
    )


def ensure_event_member(activity_id: int, user_id: int, session: Session) -> EventMember:
    existing = session.exec(
        select(EventMember).where(
            (EventMember.activity_id == activity_id) & (EventMember.user_id == user_id)
        )
    ).first()
    if existing is not None:
        return existing

    member = EventMember(activity_id=activity_id, user_id=user_id)
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


@app.post(
    "/activities",
    response_model=ActivityRead,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(data: ActivityCreate, session: Session = Depends(get_session)):
    user = get_user_or_404(data.user_id, session)
    activity = Activity(
        title=data.title.strip(),
        description=data.description.strip(),
        code=generate_unique_code(
            session,
            Activity,
            "code",
            6,
            string.ascii_uppercase + string.digits,
        ),
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)

    session.add(EventOwner(activity_id=activity.id, user_id=user.id))
    session.add(
        EventLocation(
            activity_id=activity.id,
            latitude=data.latitude,
            longitude=data.longitude,
        )
    )
    session.add(EventMember(activity_id=activity.id, user_id=user.id))
    session.commit()
    return activity_to_read(activity, session)


@app.get("/activities/{code}", response_model=ActivityRead)
def get_activity(code: str, session: Session = Depends(get_session)):
    return activity_to_read(get_activity_or_404(code, session), session)


@app.post(
    "/activities/{code}/join",
    response_model=ActivityRead,
    status_code=status.HTTP_201_CREATED,
)
def join_activity(
    code: str,
    data: ActivityJoin,
    session: Session = Depends(get_session),
):
    activity = get_activity_or_404(code, session)
    get_user_or_404(data.user_id, session)
    ensure_event_member(activity.id, data.user_id, session)
    return activity_to_read(activity, session)


@app.get(
    "/activities/{code}/participants",
    response_model=list[EventParticipantRead],
)
def list_participants(code: str, session: Session = Depends(get_session)):
    activity = get_activity_or_404(code, session)
    owner = session.get(EventOwner, activity.id)
    memberships = session.exec(
        select(EventMember)
        .where(EventMember.activity_id == activity.id)
        .order_by(EventMember.joined_at)
    ).all()

    result: list[EventParticipantRead] = []
    for membership in memberships:
        user = session.get(User, membership.user_id)
        if user is None:
            continue
        result.append(
            EventParticipantRead(
                user_id=user.id,
                name=user.name,
                photo_url=user.photo_url,
                is_host=bool(owner and owner.user_id == user.id),
                joined_at=membership.joined_at,
            )
        )
    return result


@app.get("/users/{user_id}/activities", response_model=list[ActivityRead])
def list_user_activities(user_id: int, session: Session = Depends(get_session)):
    get_user_or_404(user_id, session)
    memberships = session.exec(
        select(EventMember)
        .where(EventMember.user_id == user_id)
        .order_by(EventMember.joined_at.desc())
    ).all()

    result: list[ActivityRead] = []
    for membership in memberships:
        activity = session.get(Activity, membership.activity_id)
        if activity is not None:
            result.append(activity_to_read(activity, session))
    return result


# Legacy checkpoint endpoints are intentionally left read-only for old local data.
# New events have exactly one EventLocation pin and do not create checkpoints.
@app.get("/activities/{code}/checkpoints", response_model=list[CheckpointRead])
def list_checkpoints(code: str, session: Session = Depends(get_session)):
    activity = get_activity_or_404(code, session)
    return session.exec(
        select(Checkpoint)
        .where(Checkpoint.activity_id == activity.id)
        .order_by(Checkpoint.order_index, Checkpoint.id)
    ).all()
