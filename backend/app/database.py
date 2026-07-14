from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


def _run_lightweight_sqlite_migrations() -> None:
    """Keep existing hackathon SQLite databases usable after small schema changes."""
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.execute(text('PRAGMA table_info("user")')).fetchall()
        }
        if columns and "profile_code" not in columns:
            connection.execute(text('ALTER TABLE "user" ADD COLUMN profile_code TEXT'))
            connection.execute(
                text(
                    'CREATE INDEX IF NOT EXISTS ix_user_profile_code '
                    'ON "user" (profile_code)'
                )
            )


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _run_lightweight_sqlite_migrations()


def get_session():
    with Session(engine) as session:
        yield session
