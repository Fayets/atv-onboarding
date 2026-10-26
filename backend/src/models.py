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
    password_encrypted = Optional(str)
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
    # Contrato con ZapSign
    contract_required = Required(bool, default=False)
    payment_mode = Optional(str)
    # Solo 2K: datos del contrato que carga quien da el alta.
    call_link = Optional(str)
    current_income = Optional(str)
    target_income = Optional(str)
    contract_kind = Optional(str)
    contract_status = Optional(str, default="none")  # none | pending | signed
    contract_doc_token = Optional(str)
    contract_signer_token = Optional(str)
    contract_sign_url = Optional(str)
    contract_created_at = Optional(datetime)
    contract_signed_at = Optional(datetime)
    contract_last_check_at = Optional(datetime)
    contract_signed_pdf = Optional(bytes)
    forms = Set("OnboardingForm")


class OnboardingForm(db.Entity):
    _table_ = ("onboarding", "forms")

    id = PrimaryKey(uuid.UUID)
    session = Required("OnboardingSession", column="session_id")
    form_data = Optional(Json)
    submitted_at = Optional(datetime)
