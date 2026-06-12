from uuid import UUID

from decouple import config
from fastapi import APIRouter, Depends, Header, HTTPException

from src import schemas
from src.deps import verify_ecosystem_session
from src.services.admin_services import AdminServices

router = APIRouter(prefix="/api/admin", tags=["admin"])
service = AdminServices()


def verify_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> str:
    expected = config("ADMIN_API_KEY", default="")
    if not expected or x_admin_key != expected:
        raise HTTPException(status_code=401, detail="No autorizado")
    return x_admin_key


@router.post("/add-client", response_model=schemas.AddClientResponse)
def add_client(
    payload: schemas.AddClientRequest,
    _: str = Depends(verify_admin_key),
):
    try:
        return service.add_client(payload)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al crear el cliente.",
        )


@router.patch(
    "/sessions/{session_id}/discord-channel",
    response_model=schemas.UpdateDiscordChannelResponse,
)
def update_discord_channel(
    session_id: UUID,
    payload: schemas.UpdateDiscordChannelRequest,
    _: str = Depends(verify_admin_key),
):
    try:
        return service.update_discord_channel(session_id, payload)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al actualizar el canal de Discord.",
        )


@router.get(
    "/sessions/pending-role-assignment",
    response_model=schemas.PendingRoleAssignmentResponse,
)
def get_pending_role_assignments(_: str = Depends(verify_admin_key)):
    try:
        return service.get_pending_role_assignments()
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al obtener sesiones pendientes de rol.",
        )


@router.get(
    "/sessions/by-invite-code/{invite_code}",
    response_model=schemas.SessionByInviteCodeResponse,
)
def get_session_by_invite_code(
    invite_code: str,
    _: str = Depends(verify_admin_key),
):
    try:
        return service.get_session_by_invite_code(invite_code)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al buscar la sesión por invite.",
        )


@router.patch(
    "/sessions/{session_id}/role-assigned",
    response_model=schemas.RoleAssignedResponse,
)
def mark_role_assigned(
    session_id: UUID,
    _: str = Depends(verify_admin_key),
):
    try:
        return service.mark_role_assigned(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al marcar el rol como asignado.",
        )


@router.get("/dashboard", response_model=schemas.DashboardResponse)
def get_dashboard(_: str = Depends(verify_ecosystem_session)):
    try:
        return service.get_dashboard()
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al obtener el dashboard.",
        )


@router.get("/sessions/{session_id}/form", response_model=schemas.SessionFormResponse)
def get_session_form(session_id: UUID, _: str = Depends(verify_ecosystem_session)):
    try:
        return service.get_session_form(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al obtener el formulario.",
        )


@router.patch(
    "/sessions/{session_id}/call-scheduled",
    response_model=schemas.CallStatusResponse,
)
def mark_call_scheduled(session_id: UUID, _: str = Depends(verify_ecosystem_session)):
    try:
        return service.mark_call_scheduled(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al marcar la call como agendada.",
        )


@router.patch(
    "/sessions/{session_id}/call-completed",
    response_model=schemas.CallStatusResponse,
)
def mark_call_completed(session_id: UUID, _: str = Depends(verify_ecosystem_session)):
    try:
        return service.mark_call_completed(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al marcar la call como realizada.",
        )


@router.patch(
    "/sessions/{session_id}/estado",
    response_model=schemas.UpdateEstadoResponse,
)
def update_estado(
    session_id: UUID,
    payload: schemas.UpdateEstadoRequest,
    _: str = Depends(verify_ecosystem_session),
):
    try:
        return service.update_estado(session_id, payload)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al actualizar el estado.",
        )
