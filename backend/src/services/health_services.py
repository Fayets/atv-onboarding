from fastapi import HTTPException
from pony.orm import db_session
from pony.orm.dbapiprovider import ProgrammingError

from src import schemas
from src.models import OnboardingForm, OnboardingSession

TABLES = ["onboarding.sessions", "onboarding.forms"]


class HealthServices:
    def check_db(self) -> schemas.HealthDbResponse:
        try:
            with db_session:
                OnboardingSession.select().count()
                OnboardingForm.select().count()
        except ProgrammingError as e:
            message = e.args[0] if e.args else str(e)
            raise HTTPException(
                status_code=503,
                detail=f"Error al consultar tablas de onboarding: {message}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"No se pudo conectar a Neon: {e}",
            )

        return schemas.HealthDbResponse(status="ok", tables=TABLES)
