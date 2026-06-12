from decouple import config
from pony.orm import Database

db = Database()

MIGRATIONS = [
    """
    ALTER TABLE onboarding.sessions
    ADD COLUMN IF NOT EXISTS discord_channel_id TEXT;
    """,
    """
    ALTER TABLE onboarding.sessions
    ADD COLUMN IF NOT EXISTS discord_invite_url TEXT;
    """,
    """
    ALTER TABLE onboarding.sessions
    ADD COLUMN IF NOT EXISTS discord_invite_used BOOLEAN DEFAULT FALSE;
    """,
    """
    ALTER TABLE onboarding.sessions
    ADD COLUMN IF NOT EXISTS form_submitted_at TIMESTAMP;
    """,
    """
    ALTER TABLE onboarding.sessions
    ADD COLUMN IF NOT EXISTS call_scheduled_at TIMESTAMP;
    """,
    """
    ALTER TABLE onboarding.sessions
    ADD COLUMN IF NOT EXISTS call_completed_at TIMESTAMP;
    """,
]


def run_migrations() -> None:
    import psycopg2

    database_url = config("DATABASE_URL", default="")
    if not database_url:
        return

    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            for migration in MIGRATIONS:
                cur.execute(migration)
    finally:
        conn.close()


def init_db() -> None:
    db.bind(
        provider=config("DB_PROVIDER"),
        user=config("DB_USER"),
        password=config("DB_PASS"),
        host=config("DB_HOST"),
        database=config("DB_NAME"),
        port=config("DB_PORT", default=5432, cast=int),
        sslmode=config("DB_SSLMODE", default="require"),
    )

    run_migrations()

    import src.models  # noqa: F401

    db.generate_mapping(create_tables=False)
