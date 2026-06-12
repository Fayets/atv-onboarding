import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from pony.orm import db_session

from src import schemas
from src.models import OnboardingForm, OnboardingSession
from src.services.auth_services import AuthServices
from src.services.skool_services import SkoolServices


class OnboardingServices:
    def __init__(self) -> None:
        self._auth = AuthServices()
        self._skool = SkoolServices()

    def submit_form(
        self, session_id: UUID, payload: schemas.FormSubmitRequest
    ) -> schemas.FormSubmitResponse:
        self._auth.get_session_by_id(session_id)

        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=401, detail="Sesión inválida")

            if session.form_submitted:
                raise HTTPException(
                    status_code=400,
                    detail="El formulario ya fue enviado.",
                )

            OnboardingForm(
                id=uuid.uuid4(),
                session=session,
                form_data=payload.model_dump(),
                submitted_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            session.form_submitted = True
            session.form_submitted_at = datetime.now(timezone.utc).replace(tzinfo=None)

        return schemas.FormSubmitResponse()

    async def join_skool(self, session_id: UUID) -> schemas.SkoolResponse:
        session_data = self._auth.get_session_by_id(session_id)

        if session_data.skool_used:
            raise HTTPException(
                status_code=400,
                detail="Ya usaste tu invitación de Skool",
            )

        if not session_data.client_email:
            raise HTTPException(
                status_code=400,
                detail="No hay email asociado a esta sesión.",
            )

        await self._skool.send_invitation(session_data.client_email)

        with db_session:
            session = OnboardingSession.get(id=session_id)
            if session:
                session.skool_used = True

        return schemas.SkoolResponse()

    def join_discord(self, session_id: UUID) -> schemas.DiscordResponse:
        session_data = self._auth.get_session_by_id(session_id)

        if session_data.discord_invite_used:
            raise HTTPException(
                status_code=400,
                detail="Ya usaste tu invitación de Discord",
            )

        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=401, detail="Sesión inválida")
            session.discord_invite_used = True

        return schemas.DiscordResponse()
