import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from decouple import config

logger = logging.getLogger(__name__)

SMTP_HOST = config("SMTP_HOST", default="").strip()
SMTP_PORT = config("SMTP_PORT", default=587, cast=int)
SMTP_USER = config("SMTP_USER", default="").strip()
SMTP_PASSWORD = config("SMTP_PASSWORD", default="").strip()
SMTP_FROM = config("SMTP_FROM", default="").strip()
ONBOARDING_FRONTEND_URL = config(
    "ONBOARDING_FRONTEND_URL", default="http://localhost:5173"
).rstrip("/")

LOGO_PATH = (
    Path(__file__).resolve().parents[3] / "frontend" / "public" / "logowhite.png"
)
CONTACT_EMAIL = "aumentatuvalorx@gmail.com"

ARGENTINA_TZ = timezone(timedelta(hours=-3))


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_FROM)


def _mask_secret(value: str) -> str:
    if not value:
        return "(vacío)"
    return f"*** ({len(value)} chars)"


print("[email_service] SMTP config al iniciar:")
print(f"  SMTP_HOST={SMTP_HOST!r}")
print(f"  SMTP_PORT={SMTP_PORT!r}")
print(f"  SMTP_USER={SMTP_USER!r}")
print(f"  SMTP_PASSWORD={_mask_secret(SMTP_PASSWORD)}")
print(f"  SMTP_FROM={SMTP_FROM!r}")
print(f"  ONBOARDING_FRONTEND_URL={ONBOARDING_FRONTEND_URL!r}")
print(f"  _smtp_configured()={_smtp_configured()}")


def _format_expires_at(expires_at: datetime) -> str:
    if expires_at.tzinfo is None:
        expires_utc = expires_at.replace(tzinfo=timezone.utc)
    else:
        expires_utc = expires_at.astimezone(timezone.utc)

    expires_ar = expires_utc.astimezone(ARGENTINA_TZ)
    return f"{expires_ar.strftime('%d/%m/%Y %H:%M')} (hora de Argentina)"


def _build_html(
    name: str,
    password: str,
    plan: str,
    expires_at: datetime,
    onboarding_url: str,
    logo_cid: str | None,
) -> str:
    logo_html = (
        f'<img src="cid:{logo_cid}" alt="ATV" width="160" style="display:block;margin:0 auto 24px;" />'
        if logo_cid
        else f'<p style="text-align:center;font-size:24px;font-weight:700;color:#e63946;margin:0 0 24px;">ATV</p>'
    )
    expires_label = _format_expires_at(expires_at)

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a ATV</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Inter,Arial,sans-serif;color:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#121212;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 32px 24px;">
              {logo_html}
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;text-align:center;">
                Bienvenido a ATV, {name}
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.75);text-align:center;">
                Tu acceso al onboarding ya está listo. Tenés <strong style="color:#ffffff;">24 horas</strong> para ingresar y completar el proceso antes de que expire tu acceso.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.55);text-align:center;">
                Plan: <strong style="color:#ffffff;">{plan}</strong><br />
                Vence el: <strong style="color:#ffffff;">{expires_label}</strong>
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="{onboarding_url}" style="display:inline-block;background:linear-gradient(135deg,#e63946 0%,#c1121f 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:10px;">
                      Acceder al onboarding
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:rgba(230,57,70,0.08);border:1px solid rgba(230,57,70,0.35);border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);">
                      Tu contraseña de acceso
                    </p>
                    <p style="margin:0;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:0.12em;color:#ffffff;font-family:monospace;">
                      {password}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.45);text-align:center;">
                Usá tu email y esta contraseña para iniciar sesión en el onboarding.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.35);">
                ¿Necesitás ayuda? Escribinos a
                <a href="mailto:{CONTACT_EMAIL}" style="color:#e63946;text-decoration:none;">{CONTACT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


class EmailServices:
    def send_onboarding_email(
        self,
        to_email: str,
        name: str,
        password: str,
        plan: str,
        expires_at: datetime,
        onboarding_url: str,
    ) -> None:
        if not _smtp_configured():
            logger.warning(
                "SMTP no configurado; se omite el envío de email de onboarding a %s",
                to_email,
            )
            return

        logo_cid = "atv-logo"
        html_body = _build_html(
            name=name,
            password=password,
            plan=plan,
            expires_at=expires_at,
            onboarding_url=onboarding_url,
            logo_cid=logo_cid if LOGO_PATH.is_file() else None,
        )

        message = MIMEMultipart("related")
        message["Subject"] = f"Bienvenido a ATV, {name}"
        message["From"] = SMTP_FROM
        message["To"] = to_email

        alternative = MIMEMultipart("alternative")
        alternative.attach(MIMEText(html_body, "html", "utf-8"))
        message.attach(alternative)

        if LOGO_PATH.is_file():
            with LOGO_PATH.open("rb") as logo_file:
                logo_part = MIMEImage(logo_file.read(), _subtype="png")
            logo_part.add_header("Content-ID", f"<{logo_cid}>")
            logo_part.add_header("Content-Disposition", "inline", filename="logowhite.png")
            message.attach(logo_part)
        else:
            logger.warning("Logo no encontrado en %s; el email se enviará sin imagen.", LOGO_PATH)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], message.as_string())

        logger.info("Email de onboarding enviado a %s", to_email)
