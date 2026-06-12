import traceback
from uuid import UUID

from decouple import config
from fastapi import APIRouter, HTTPException, Request, Response

from src import schemas
from src.services.auth_services import AuthServices, SESSION_COOKIE_NAME

router = APIRouter(prefix="/api/auth", tags=["auth"])
service = AuthServices()

SESSION_MAX_AGE = 60 * 60 * 24
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=False, cast=bool)


def _set_session_cookie(response: Response, session_id: UUID) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=str(session_id),
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        max_age=SESSION_MAX_AGE,
        path="/",
        samesite="strict",
    )


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, response: Response):
    try:
        session_id = service.login(payload.password.strip())
        _set_session_cookie(response, session_id)
        return schemas.LoginResponse()
    except HTTPException as e:
        raise e
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado al iniciar sesión: {type(exc).__name__}: {exc}",
        )


@router.get("/session", response_model=schemas.SessionResponse)
def get_session(request: Request):
    try:
        session_id = service.parse_session_id(request.cookies.get(SESSION_COOKIE_NAME))
        return service.get_session_by_id(session_id)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al obtener la sesión.",
        )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"ok": True}
