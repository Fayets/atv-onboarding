from fastapi import APIRouter, HTTPException, Request

from src import schemas
from src.services.auth_services import AuthServices, SESSION_COOKIE_NAME
from src.services.onboarding_services import OnboardingServices

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])
auth_service = AuthServices()
service = OnboardingServices()


@router.post("/submit-form", response_model=schemas.FormSubmitResponse)
def submit_form(payload: schemas.FormSubmitRequest, request: Request):
    try:
        session_id = auth_service.parse_session_id(
            request.cookies.get(SESSION_COOKIE_NAME)
        )
        return service.submit_form(session_id, payload)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al enviar el formulario.",
        )


@router.post("/join-skool", response_model=schemas.SkoolResponse)
async def join_skool(request: Request):
    try:
        session_id = auth_service.parse_session_id(
            request.cookies.get(SESSION_COOKIE_NAME)
        )
        return await service.join_skool(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al enviar la invitación de Skool.",
        )


@router.post("/join-discord", response_model=schemas.DiscordResponse)
def join_discord(request: Request):
    try:
        session_id = auth_service.parse_session_id(
            request.cookies.get(SESSION_COOKIE_NAME)
        )
        return service.join_discord(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al registrar la unión a Discord.",
        )
