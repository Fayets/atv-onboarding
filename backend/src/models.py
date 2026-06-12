import uuid
from datetime import datetime

from pony.orm import Json, Optional, PrimaryKey, Required, Set

from src.db import db


class OnboardingSession(db.Entity):
    _table_ = ("onboarding", "sessions")

    id = PrimaryKey(uuid.UUID)
    client_name = Optional(str)
    client_email = Optional(str)
    plan = Optional(str)
    password_hash = Optional(str)
    used = Required(bool, default=False)
    skool_used = Required(bool, default=False)
    form_submitted = Required(bool, default=False)
    form_submitted_at = Optional(datetime)
    call_scheduled_at = Optional(datetime)
    call_completed_at = Optional(datetime)
    created_at = Optional(datetime)
    expires_at = Optional(datetime)
    discord_channel_id = Optional(str)
    discord_invite_url = Optional(str)
    discord_invite_used = Required(bool, default=False)
    role_assigned = Required(bool, default=False)
    forms = Set("OnboardingForm")


class OnboardingForm(db.Entity):
    _table_ = ("onboarding", "forms")

    id = PrimaryKey(uuid.UUID)
    session = Required("OnboardingSession", column="session_id")
    form_data = Optional(Json)
    submitted_at = Optional(datetime)
