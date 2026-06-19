from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    ok: bool = True


class FormSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="allow")


class SessionResponse(BaseModel):
    id: UUID
    client_name: str | None = None
    client_email: str | None = None
    skool_used: bool
    form_submitted: bool
    discord_url: str | None = None
    discord_invite_url: str | None = None
    discord_invite_used: bool = False
    form_data: FormSubmitRequest | None = None


class FormSubmitResponse(BaseModel):
    ok: bool = True


class SkoolResponse(BaseModel):
    ok: bool = True


class DiscordResponse(BaseModel):
    ok: bool = True


class ErrorResponse(BaseModel):
    error: str


class HealthResponse(BaseModel):
    status: str = "ok"


class HealthDbResponse(BaseModel):
    status: str = "ok"
    tables: list[str]


class AddClientRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    plan: Literal["Boost", "Mentoría", "Advantage"]


class AddClientResponse(BaseModel):
    session_id: str
    password: str
    expires_at: str
    name: str
    email: str
    plan: str
    channel_slug: str


class UpdateDiscordChannelRequest(BaseModel):
    discord_channel_id: str = Field(min_length=1)
    discord_invite_url: str | None = None


class UpdateDiscordChannelResponse(BaseModel):
    session_id: str
    discord_channel_id: str
    discord_invite_url: str | None = None


class SessionByInviteCodeResponse(BaseModel):
    session_id: str
    plan: str | None = None
    role_assigned: bool


class RoleAssignedResponse(BaseModel):
    ok: bool = True
    session_id: str
    role_assigned: bool = True


class PendingRoleAssignmentItem(BaseModel):
    session_id: str
    plan: str | None = None
    discord_channel_id: str
    discord_invite_url: str | None = None


class PendingRoleAssignmentResponse(BaseModel):
    sessions: list[PendingRoleAssignmentItem]


EstadoOnboarding = Literal[
    "enviado",
    "formulario_completo",
    "call_agendada",
    "call_realizada",
]


class DashboardSessionItem(BaseModel):
    id: UUID
    client_name: str | None = None
    client_email: str | None = None
    plan: str | None = None
    created_at: datetime | None = None
    form_submitted: bool
    form_submitted_at: datetime | None = None
    call_scheduled_at: datetime | None = None
    call_completed_at: datetime | None = None
    estado_actual: EstadoOnboarding
    dias_en_estado: int
    alerta: bool
    form_data: FormSubmitRequest | None = None


class DashboardResponse(BaseModel):
    sessions: list[DashboardSessionItem]


class CallStatusResponse(BaseModel):
    ok: bool = True
    session_id: str
    call_scheduled_at: datetime | None = None
    call_completed_at: datetime | None = None


class UpdateEstadoRequest(BaseModel):
    estado: EstadoOnboarding


class UpdateEstadoResponse(BaseModel):
    ok: bool = True
    session_id: str
    estado_actual: EstadoOnboarding
    call_scheduled_at: datetime | None = None
    call_completed_at: datetime | None = None


class SessionFormResponse(BaseModel):
    session_id: str
    client_name: str | None = None
    client_email: str | None = None
    plan: str | None = None
    submitted_at: datetime | None = None
    form_data: FormSubmitRequest


class MetricsResponse(BaseModel):
    total_sessions: int
    with_form: int
    metrics: dict[str, dict[str, int]]
