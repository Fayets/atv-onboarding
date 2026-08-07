import re
import secrets
import string
import unicodedata
import uuid
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from fastapi import HTTPException
from pony.orm import db_session

from src import schemas
from src.models import OnboardingSession
from src.password_crypto import decrypt_password, encrypt_password
from src.services.email_service import EmailServices, ONBOARDING_FRONTEND_URL

logger = logging.getLogger(__name__)

VALID_PLANS = {"Boost", "Mentoría", "Advantage"}
PASSWORD_ALPHABET = string.ascii_letters + string.digits


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _generate_password() -> str:
    return "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(8))


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _resolve_form_submitted_at(session: OnboardingSession) -> datetime | None:
    if session.form_submitted_at:
        return session.form_submitted_at
    if session.forms:
        return max(
            session.forms,
            key=lambda form: form.submitted_at or datetime.min.replace(tzinfo=None),
        ).submitted_at
    return None


def _compute_estado(session: OnboardingSession) -> str:
    if session.form_submitted:
        return "formulario_completo"
    return "enviado"


def _resolve_form_data(session: OnboardingSession) -> schemas.FormSubmitRequest | None:
    if not session.form_submitted or not session.forms:
        return None

    latest_form = max(
        session.forms,
        key=lambda form: form.submitted_at or datetime.min.replace(tzinfo=None),
    )
    if not latest_form.form_data:
        return None

    return schemas.FormSubmitRequest(**latest_form.form_data)


def _to_dashboard_item(session: OnboardingSession) -> schemas.DashboardSessionItem:
    return schemas.DashboardSessionItem(
        id=session.id,
        client_name=session.client_name,
        client_email=session.client_email,
        plan=session.plan,
        created_at=session.created_at,
        expires_at=session.expires_at,
        form_submitted=session.form_submitted,
        form_submitted_at=session.form_submitted_at or _resolve_form_submitted_at(session),
        estado_actual=_compute_estado(session),
        has_access_password=bool(session.password_encrypted),
        form_data=_resolve_form_data(session),
    )


def slugify_name(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = ascii_text.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "cliente"


class AdminServices:
    def __init__(self) -> None:
        self._email = EmailServices()

    def add_client(self, payload: schemas.AddClientRequest) -> schemas.AddClientResponse:
        if payload.plan not in VALID_PLANS:
            raise HTTPException(
                status_code=400,
                detail="Plan inválido. Opciones: Boost, Mentoría, Advantage.",
            )

        password = _generate_password()
        password_hash = _hash_password(password)
        password_encrypted = encrypt_password(password)
        channel_slug = slugify_name(payload.name)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        expires_at = now + timedelta(hours=48)
        session_id = uuid.uuid4()

        with db_session:
            OnboardingSession(
                id=session_id,
                client_name=payload.name,
                client_email=payload.email,
                plan=payload.plan,
                password_hash=password_hash,
                password_encrypted=password_encrypted,
                used=False,
                skool_used=False,
                form_submitted=False,
                created_at=now,
                expires_at=expires_at,
            )

        onboarding_url = f"{ONBOARDING_FRONTEND_URL}/"

        try:
            self._email.send_onboarding_email(
                to_email=payload.email,
                name=payload.name,
                password=password,
                plan=payload.plan,
                expires_at=expires_at,
                onboarding_url=onboarding_url,
            )
        except Exception:
            logger.exception(
                "Error al enviar email de onboarding a %s", payload.email
            )

        return schemas.AddClientResponse(
            session_id=str(session_id),
            password=password,
            expires_at=expires_at.isoformat(),
            name=payload.name,
            email=payload.email,
            plan=payload.plan,
            channel_slug=channel_slug,
        )

    def update_discord_channel(
        self, session_id: UUID, payload: schemas.UpdateDiscordChannelRequest
    ) -> schemas.UpdateDiscordChannelResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            session.discord_channel_id = payload.discord_channel_id
            if payload.discord_invite_url is not None:
                session.discord_invite_url = payload.discord_invite_url

        return schemas.UpdateDiscordChannelResponse(
            session_id=str(session_id),
            discord_channel_id=payload.discord_channel_id,
            discord_invite_url=payload.discord_invite_url,
        )

    def get_session_by_invite_code(
        self, invite_code: str
    ) -> schemas.SessionByInviteCodeResponse:
        with db_session:
            session = None
            for candidate in OnboardingSession.select():
                if (
                    candidate.discord_invite_url
                    and invite_code in candidate.discord_invite_url
                ):
                    session = candidate
                    break

            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            return schemas.SessionByInviteCodeResponse(
                session_id=str(session.id),
                plan=session.plan,
                role_assigned=session.role_assigned,
            )

    def mark_role_assigned(self, session_id: UUID) -> schemas.RoleAssignedResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            session.role_assigned = True

        return schemas.RoleAssignedResponse(session_id=str(session_id))

    def get_pending_role_assignments(
        self,
    ) -> schemas.PendingRoleAssignmentResponse:
        with db_session:
            pending = [
                session
                for session in OnboardingSession.select()
                if (
                    not session.role_assigned
                    and session.discord_channel_id
                    and session.discord_invite_url
                )
            ]
            pending.sort(
                key=lambda session: session.created_at
                or datetime.min.replace(tzinfo=None),
                reverse=True,
            )
            items = [
                schemas.PendingRoleAssignmentItem(
                    session_id=str(session.id),
                    plan=session.plan,
                    discord_channel_id=session.discord_channel_id,
                    discord_invite_url=session.discord_invite_url,
                )
                for session in pending
            ]

        return schemas.PendingRoleAssignmentResponse(sessions=items)

    def get_dashboard(self) -> schemas.DashboardResponse:
        with db_session:
            sessions = list(OnboardingSession.select().order_by(OnboardingSession.created_at.desc()))
            items = [_to_dashboard_item(session) for session in sessions]

        return schemas.DashboardResponse(sessions=items)

    def get_session_form(self, session_id: UUID) -> schemas.SessionFormResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            if not session.forms:
                raise HTTPException(status_code=404, detail="Formulario no encontrado.")

            latest_form = max(
                session.forms,
                key=lambda form: form.submitted_at or datetime.min.replace(tzinfo=None),
            )
            if not latest_form.form_data:
                raise HTTPException(status_code=404, detail="Formulario no encontrado.")

            return schemas.SessionFormResponse(
                session_id=str(session_id),
                client_name=session.client_name,
                client_email=session.client_email,
                plan=session.plan,
                submitted_at=latest_form.submitted_at,
                form_data=schemas.FormSubmitRequest(**latest_form.form_data),
            )

    def get_access_password(self, session_id: UUID) -> schemas.SessionAccessPasswordResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            password = decrypt_password(session.password_encrypted)
            if not password:
                raise HTTPException(
                    status_code=404,
                    detail="La clave no está disponible. Reenviá una nueva al cliente.",
                )

            return schemas.SessionAccessPasswordResponse(
                session_id=str(session_id),
                password=password,
                expires_at=session.expires_at,
            )

    def resend_access_password(self, session_id: UUID) -> schemas.ResendAccessResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            if not session.client_email or not session.client_name:
                raise HTTPException(
                    status_code=400,
                    detail="La sesión no tiene email o nombre de cliente.",
                )

            password = _generate_password()
            now = _utc_now()
            expires_at = now + timedelta(hours=48)

            session.password_hash = _hash_password(password)
            session.password_encrypted = encrypt_password(password)
            session.expires_at = expires_at
            session.used = False

            client_email = session.client_email
            client_name = session.client_name
            plan = session.plan or "Boost"

        email_sent = False
        try:
            self._email.send_onboarding_email(
                to_email=client_email,
                name=client_name,
                password=password,
                plan=plan,
                expires_at=expires_at,
                onboarding_url=f"{ONBOARDING_FRONTEND_URL}/",
            )
            email_sent = True
        except Exception:
            logger.exception(
                "Error al reenviar email de onboarding a %s", client_email
            )

        return schemas.ResendAccessResponse(
            session_id=str(session_id),
            password=password,
            expires_at=expires_at,
            email_sent=email_sent,
        )

    def update_estado(
        self, session_id: UUID, payload: schemas.UpdateEstadoRequest
    ) -> schemas.UpdateEstadoResponse:
        estado = payload.estado

        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            if estado == "enviado":
                if session.form_submitted:
                    raise HTTPException(
                        status_code=400,
                        detail="No se puede volver a 'Enviado' si el formulario ya fue completado.",
                    )

            elif estado == "formulario_completo":
                if not session.form_submitted:
                    raise HTTPException(
                        status_code=400,
                        detail="El cliente debe completar el formulario.",
                    )

            estado_actual = _compute_estado(session)

        return schemas.UpdateEstadoResponse(
            session_id=str(session_id),
            estado_actual=estado_actual,
        )

    def delete_session(self, session_id: UUID) -> schemas.DeleteSessionResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Sesión no encontrada.")

            for form in list(session.forms):
                form.delete()
            session.delete()

        return schemas.DeleteSessionResponse(session_id=str(session_id))
