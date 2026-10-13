"""Cliente HTTP de la API de ZapSign.

Solo habla con ZapSign; no sabe nada de sesiones ni de la base.
Docs: https://docs.zapsign.com.br
"""
import base64
import logging

import httpx
from decouple import config

logger = logging.getLogger(__name__)


class ZapSignError(RuntimeError):
    pass


class ZapSignService:
    def __init__(self) -> None:
        self._base = config("ZAPSIGN_API_BASE", default="https://api.zapsign.com.br").rstrip("/")
        self._token = config("ZAPSIGN_API_TOKEN", default="").strip()
        self._timeout = httpx.Timeout(30.0)

    @property
    def configured(self) -> bool:
        return bool(self._token)

    def _headers(self) -> dict[str, str]:
        if not self._token:
            raise ZapSignError("ZAPSIGN_API_TOKEN no configurado.")
        return {"Authorization": f"Bearer {self._token}"}

    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self._base}/api/v1/{path.lstrip('/')}"
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.request(method, url, headers=self._headers(), **kwargs)
        if resp.status_code == 402:
            raise ZapSignError("ZapSign exige un plan API activo para crear documentos (402).")
        if resp.status_code >= 400:
            logger.error("ZapSign %s %s -> %s %s", method, path, resp.status_code, resp.text[:500])
            raise ZapSignError(f"ZapSign respondió {resp.status_code}.")
        return resp.json()

    # ---------- documentos ----------

    def create_doc_from_template(
        self,
        template_id: str,
        signer_name: str,
        signer_email: str,
        data: dict[str, str],
        external_id: str,
    ) -> dict:
        """Crea un documento desde una plantilla DOCX con las variables precargadas.

        Las variables que no se mandan las completa el firmante en ZapSign antes de firmar
        (signer_has_incomplete_fields). El email al firmante lo manda el onboarding, no ZapSign.
        """
        body = {
            "template_id": template_id,
            "signer_name": signer_name,
            "signer_email": signer_email,
            "lang": "es",
            "external_id": external_id,
            "signer_has_incomplete_fields": True,
            "send_automatic_email": False,
            "data": [{"de": "{{" + k + "}}", "para": v} for k, v in data.items()],
        }
        return self._request("POST", "models/create-doc/", json=body)

    def get_doc(self, doc_token: str) -> dict:
        return self._request("GET", f"docs/{doc_token}/")

    def download(self, url: str) -> bytes:
        with httpx.Client(timeout=httpx.Timeout(60.0), follow_redirects=True) as client:
            resp = client.get(url)
        if resp.status_code >= 400:
            raise ZapSignError(f"No se pudo bajar el archivo firmado ({resp.status_code}).")
        return resp.content

    # ---------- plantillas (se usan desde scripts, no desde el flujo) ----------

    def create_template_docx(
        self,
        name: str,
        docx_bytes: bytes,
        folder_path: str = "/",
        redirect_link: str = "",
        lang: str = "es",
    ) -> dict:
        body = {
            "name": name,
            "base64_docx": base64.b64encode(docx_bytes).decode("ascii"),
            "lang": lang,
            "folder_path": folder_path,
            "redirect_link": redirect_link,
            "first_signer": {"auth_mode": "assinaturaTela", "blank_phone": True},
        }
        return self._request("POST", "templates/create", json=body)

    def update_template_form(self, template_token: str, inputs: list[dict]) -> dict:
        return self._request(
            "POST",
            "templates/update-form/",
            json={"token": template_token, "inputs": inputs},
        )

    def list_templates(self) -> list[dict]:
        return self._request("GET", "templates/").get("results", [])
