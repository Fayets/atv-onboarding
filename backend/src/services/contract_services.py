"""Paso "Firmá tu contrato": decide qué contrato va, lo crea en ZapSign y registra la firma."""
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from decouple import config
from fastapi import HTTPException
from pony.orm import db_session

from src import schemas
from src.models import OnboardingSession
from src.plans import CONTRACT_BY_PLAN, CONTRACT_LABELS, PAYMENT_MODES, SINGLE_PAYMENT_CONTRACTS
from src.services.zapsign_service import ZapSignError, ZapSignService

logger = logging.getLogger(__name__)

MESES = (
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
)
TZ = ZoneInfo("America/Argentina/Buenos_Aires")


def _sumar_meses(d: datetime, meses: int) -> datetime:
    """El mismo día N meses después; si ese mes es más corto, su último día (31/01 + 1 mes = 28/02)."""
    import calendar

    m = d.month - 1 + meses
    anio, mes = d.year + m // 12, m % 12 + 1
    return d.replace(year=anio, month=mes, day=min(d.day, calendar.monthrange(anio, mes)[1]))


def _fecha_larga(d: datetime) -> str:
    return f"{d.day} de {MESES[d.month - 1].lower()} de {d.year}"

# Cada cuántos segundos, como máximo, le preguntamos a ZapSign por un contrato pendiente
# cuando el cliente está esperando. El webhook es el camino principal; esto es el respaldo.
CHECK_EVERY_SECONDS = 30


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _template_id(kind: str) -> str:
    return config(f"ZAPSIGN_TEMPLATE_{kind.upper()}", default="").strip()


def _to_response(session: OnboardingSession) -> schemas.ContractResponse:
    kind = session.contract_kind or CONTRACT_BY_PLAN.get(session.plan or "")
    return schemas.ContractResponse(
        required=bool(session.contract_required),
        status=session.contract_status or "none",
        kind=kind,
        label=CONTRACT_LABELS.get(kind or ""),
        plan=session.plan,
        payment_mode=session.payment_mode,
        sign_url=session.contract_sign_url if session.contract_status == "pending" else None,
        created_at=session.contract_created_at,
        signed_at=session.contract_signed_at,
        has_pdf=session.contract_signed_pdf is not None,
    )


class ContractServices:
    def __init__(self) -> None:
        self._zapsign = ZapSignService()

    # ---------- lectura ----------

    def get(self, session_id: UUID) -> schemas.ContractResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=401, detail="Sesión inválida")
            if session.contract_status == "pending":
                self._refresh_from_zapsign_if_due(session)
            return _to_response(session)

    def signed_pdf(self, session_id: UUID) -> tuple[bytes, str]:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session or session.contract_signed_pdf is None:
                raise HTTPException(status_code=404, detail="Todavía no hay contrato firmado.")
            label = CONTRACT_LABELS.get(session.contract_kind or "", "Contrato ATV")
            name = (session.client_name or "cliente").strip().replace(" ", "-")
            return bytes(session.contract_signed_pdf), f"{label} - {name}.pdf"

    # ---------- inicio de firma ----------

    def start(self, session_id: UUID) -> schemas.ContractResponse:
        with db_session:
            session = OnboardingSession.get(id=session_id)
            if not session:
                raise HTTPException(status_code=401, detail="Sesión inválida")
            if not session.contract_required:
                raise HTTPException(status_code=400, detail="Esta sesión no requiere contrato.")
            if session.contract_status == "signed":
                return _to_response(session)
            if session.contract_status == "pending" and session.contract_sign_url:
                # No se crea otro documento: cada documento consume crédito del plan.
                return _to_response(session)

            kind = session.contract_kind or CONTRACT_BY_PLAN.get(session.plan or "")
            if not kind:
                raise HTTPException(status_code=400, detail=f"El plan {session.plan!r} no tiene contrato asignado.")
            template_id = _template_id(kind)
            if not template_id:
                raise HTTPException(status_code=503, detail="La plantilla del contrato no está configurada todavía.")

            data = self._build_variables(session, kind)
            try:
                doc = self._zapsign.create_doc_from_template(
                    template_id=template_id,
                    signer_name=session.client_name or "",
                    signer_email=session.client_email or "",
                    data=data,
                    external_id=str(session.id),
                )
            except ZapSignError as exc:
                logger.error("No se pudo crear el contrato para %s: %s", session.id, exc)
                raise HTTPException(status_code=502, detail="No pudimos generar tu contrato. Probá de nuevo en un minuto.")

            signers = doc.get("signers") or []
            signer = signers[0] if signers else {}
            session.contract_kind = kind
            session.contract_doc_token = doc.get("token")
            session.contract_signer_token = signer.get("token")
            session.contract_sign_url = signer.get("sign_url")
            session.contract_status = "pending"
            session.contract_created_at = _now()
            session.contract_last_check_at = _now()
            logger.info("Contrato %s creado para sesión %s (doc %s)", kind, session.id, session.contract_doc_token)
            return _to_response(session)

    def _build_variables(self, session: OnboardingSession, kind: str) -> dict[str, str]:
        today = datetime.now(TZ)
        data = {
            "DIA": str(today.day),
            "MES": MESES[today.month - 1],
            "ANIO": str(today.year),
            "NOMBRE_COMPLETO": session.client_name or "",
            "EMAIL_CONTRATANTE": session.client_email or "",
            "EMAIL_EMPRESA": config("ZAPSIGN_EMPRESA_EMAIL", default="").strip(),
        }
        if kind not in SINGLE_PAYMENT_CONTRACTS and session.payment_mode in PAYMENT_MODES:
            data["MODALIDAD_PAGO"] = session.payment_mode
        if kind == "2k":
            # Cuotas el día de la firma, a un mes y a dos meses (como el contrato de Máximo: 26/10, 26/11, 26/12).
            alta = (session.created_at.replace(tzinfo=timezone.utc).astimezone(TZ) if session.created_at else today)
            data.update({
                "FECHA_CUOTA_1": _fecha_larga(today),
                "FECHA_CUOTA_2": _fecha_larga(_sumar_meses(today, 1)),
                "FECHA_CUOTA_3": _fecha_larga(_sumar_meses(today, 2)),
                "FECHA_LLAMADA": _fecha_larga(alta),
                "LINK_LLAMADA": session.call_link or "",
                "INGRESOS_ACTUALES": session.current_income or "",
                "META_INGRESOS": session.target_income or "",
            })
        # DOCUMENTO, CALLE, CIUDAD, PROVINCIA, PAIS y, si no vino cargada, MODALIDAD_PAGO
        # los completa el cliente en ZapSign antes de firmar.
        return {k: v for k, v in data.items() if v}

    # ---------- confirmación de firma ----------

    def _refresh_from_zapsign_if_due(self, session: OnboardingSession) -> None:
        last = session.contract_last_check_at
        if last and _now() - last < timedelta(seconds=CHECK_EVERY_SECONDS):
            return
        session.contract_last_check_at = _now()
        if not session.contract_doc_token or not self._zapsign.configured:
            return
        try:
            doc = self._zapsign.get_doc(session.contract_doc_token)
        except ZapSignError as exc:
            logger.warning("No se pudo consultar el contrato %s: %s", session.contract_doc_token, exc)
            return
        if doc.get("status") == "signed" and doc.get("signed_file"):
            self._mark_signed(session, doc["signed_file"], signed_at=None)

    def _mark_signed(self, session: OnboardingSession, signed_file_url: str, signed_at: datetime | None) -> None:
        if session.contract_status == "signed" and session.contract_signed_pdf is not None:
            return
        try:
            pdf = self._zapsign.download(signed_file_url)
        except ZapSignError as exc:
            # El link vence a los 60 minutos: si falla, el próximo chequeo lo vuelve a intentar.
            logger.error("No se pudo bajar el PDF firmado de %s: %s", session.id, exc)
            pdf = None
        session.contract_status = "signed"
        session.contract_signed_at = signed_at or _now()
        if pdf:
            session.contract_signed_pdf = pdf
        logger.info("Contrato firmado para sesión %s", session.id)

    def handle_webhook(self, payload: dict) -> str:
        """Procesa un evento de ZapSign. Devuelve un texto corto para el log."""
        event = payload.get("event_type")
        if event != "doc_signed" or payload.get("status") != "signed":
            return f"ignorado ({event}/{payload.get('status')})"

        doc_token = payload.get("token")
        external_id = payload.get("external_id")
        signed_file = payload.get("signed_file")
        with db_session:
            session = None
            if external_id:
                try:
                    session = OnboardingSession.get(id=UUID(external_id))
                except ValueError:
                    session = None
            if not session and doc_token:
                session = OnboardingSession.get(contract_doc_token=doc_token)
            if not session:
                return f"documento {doc_token} sin sesión asociada"
            if not signed_file:
                # Sin link no hay PDF: lo busca el próximo chequeo contra la API.
                session.contract_status = "signed"
                session.contract_signed_at = _now()
                return f"sesión {session.id} marcada firmada sin PDF"
            self._mark_signed(session, signed_file, signed_at=None)
            return f"sesión {session.id} firmada"
