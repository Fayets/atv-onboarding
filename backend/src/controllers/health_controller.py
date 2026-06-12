from fastapi import APIRouter, HTTPException

from src import schemas
from src.services.health_services import HealthServices

router = APIRouter(tags=["health"])
service = HealthServices()


@router.get("/health/db", response_model=schemas.HealthDbResponse)
def health_db():
    try:
        return service.check_db()
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Error inesperado al verificar la base de datos.",
        )
