import httpx
from decouple import config
from fastapi import HTTPException

SKOOL_WEBHOOK_URL = config("SKOOL_WEBHOOK_URL", default="")


class SkoolServices:
    async def send_invitation(self, email: str) -> None:
        if not SKOOL_WEBHOOK_URL:
            raise HTTPException(
                status_code=500,
                detail="SKOOL_WEBHOOK_URL no configurada",
            )

        url = f"{SKOOL_WEBHOOK_URL}{email}"

        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    url,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "",
                        "Content-Lenght": "0",
                    },
                )
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Error inesperado al enviar la invitación de Skool.",
            )
