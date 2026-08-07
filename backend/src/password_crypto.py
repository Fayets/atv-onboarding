import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from decouple import config


def _fernet_key() -> bytes:
    secret = (
        config("ACCESS_PASSWORD_KEY", default="").strip()
        or config("ECOSYSTEM_SECRET", default="").strip()
    )
    if not secret:
        raise RuntimeError(
            "ACCESS_PASSWORD_KEY o ECOSYSTEM_SECRET debe estar configurado para cifrar claves."
        )
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_password(password: str) -> str:
    return Fernet(_fernet_key()).encrypt(password.encode("utf-8")).decode("utf-8")


def decrypt_password(token: str | None) -> str | None:
    if not token:
        return None
    try:
        return Fernet(_fernet_key()).decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return None
