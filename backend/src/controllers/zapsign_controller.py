import hmac
import logging

from decouple import config
from fastapi import APIRouter, Request, Response

from src.services.contract_services import ContractServices

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/zapsign", tags=["zapsign"])
service = ContractServices()

# Se configura como header custom del webhook en ZapSign (Ajustes > Integraciones > Webhooks).
WEBHOOK_HEADER = "X-ATV-Webhook-Secret"


@router.post("/webhook")
async def zapsign_webhook(request: Request):
    secret = config("ZAPSIGN_WEBHOOK_SECRET", default="").strip()
    received = request.headers.get(WEBHOOK_HEADER, "")
    if secret and not hmac.compare_digest(secret, received):
        logger.warning("Webhook de ZapSign con secreto inválido")
        return Response(status_code=401)

    try:
        payload = await request.json()
    except Exception:
        return Response(status_code=400)

    try:
        result = service.handle_webhook(payload if isinstance(payload, dict) else {})
        logger.info("Webhook ZapSign: %s", result)
    except Exception:
        # ZapSign reintenta si no respondemos 200; preferimos loguear y no bloquear.
        logger.exception("Error procesando webhook de ZapSign")
    return {"ok": True}
