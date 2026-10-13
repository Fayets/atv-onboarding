from datetime import datetime
from uuid import UUID

import bcrypt
from decouple import config
from fastapi import HTTPException
from pony.orm import db_session

from src import schemas
from src.services.contract_services import _to_response as contract_to_response
from src.models import OnboardingSession

DISCORD_INVITE_URL = config("DISCORD_INVITE_URL", default="")
SESSION_COOKIE_NAME = "atv_session"


class AuthServices:
    def login(self, password: str) -> UUID:
        if not password:
            raise HTTPException(status_code=400, detail="Ingresá tu contraseña.")

        with db_session:
            # Sin vencimiento de clave: se puede reingresar hasta completar el formulario.
            records = [
                s for s in list(OnboardingSession.select()) if not s.form_submitted
            ]

            match = None
            for record in records:
                if record.password_hash and bcrypt.checkpw(
                    password.encode("utf-8"),
                    record.password_hash.encode("utf-8"),
                ):
                    match = record
                    break

            if not match:
                raise HTTPException(
                    status_code=401,
                    detail="Contraseña incorrecta.",
                )

            if not match.used:
                match.used = True
            return match.id

    def parse_session_id(self, raw: str | None) -> UUID:
        if not raw:
            raise HTTPException(status_code=401, detail="No autorizado")

        try:
            return UUID(raw)
        except ValueError:
            raise HTTPException(status_code=401, detail="Sesión inválida")

    def get_session_by_id(self, session_id: UUID) -> schemas.SessionResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=401, detail="Sesión inválida")

            form_data = None
            if session.form_submitted and session.forms:
                latest_form = max(
                    session.forms,
                    key=lambda form: form.submitted_at or datetime.min.replace(tzinfo=None),
                )
                if latest_form.form_data:
                    form_data = schemas.FormSubmitRequest(**latest_form.form_data)

            return schemas.SessionResponse(
                id=session.id,
                client_name=session.client_name,
                client_email=session.client_email,
                plan=session.plan,
                contract=contract_to_response(session),
                skool_used=session.skool_used,
                form_submitted=session.form_submitted,
                discord_url=DISCORD_INVITE_URL or None,
                discord_invite_url=session.discord_invite_url,
                discord_invite_used=session.discord_invite_used,
                form_data=form_data,
            )
