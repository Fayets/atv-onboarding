from fastapi import APIRouter, HTTPException, Request, Response

from src import schemas
from src.services.auth_services import AuthServices, SESSION_COOKIE_NAME
from src.services.contract_services import ContractServices
from src.services.onboarding_services import OnboardingServices

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])
auth_service = AuthServices()
service = OnboardingServices()
contract_service = ContractServices()


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


@router.get("/contract", response_model=schemas.ContractResponse)
def get_contract(request: Request):
    try:
        session_id = auth_service.parse_session_id(request.cookies.get(SESSION_COOKIE_NAME))
        return contract_service.get(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error inesperado al consultar el contrato.")


@router.post("/contract/start", response_model=schemas.ContractResponse)
def start_contract(request: Request):
    try:
        session_id = auth_service.parse_session_id(request.cookies.get(SESSION_COOKIE_NAME))
        return contract_service.start(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error inesperado al generar el contrato.")


@router.get("/contract/pdf")
def contract_pdf(request: Request):
    try:
        session_id = auth_service.parse_session_id(request.cookies.get(SESSION_COOKIE_NAME))
        pdf, filename = contract_service.signed_pdf(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error inesperado al descargar el contrato.")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
