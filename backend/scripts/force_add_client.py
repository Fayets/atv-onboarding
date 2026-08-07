#!/usr/bin/env python3
"""Crea un cliente de onboarding; con --force borra sesiones previas del mismo email."""
from __future__ import annotations

import argparse
import sys

from pony.orm import db_session, select

from src import schemas
from src.db import init_db
from src.models import OnboardingSession
from src.services.admin_services import AdminServices


def _delete_sessions_for_email(email: str) -> int:
    removed = 0
    with db_session:
        for session in list(select(s for s in OnboardingSession if s.client_email == email)):
            for form in list(session.forms):
                form.delete()
            session.delete()
            removed += 1
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Forzar alta de cliente onboarding")
    parser.add_argument("name", help='Nombre (ej: "Franco-Test")')
    parser.add_argument("email", help="Email del cliente")
    parser.add_argument(
        "--plan",
        default="Boost",
        choices=["Boost", "Mentoría", "Advantage"],
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Elimina sesiones existentes con ese email antes de crear",
    )
    args = parser.parse_args()

    init_db()

    if args.force:
        removed = _delete_sessions_for_email(args.email)
        if removed:
            print(f"Eliminadas {removed} sesión(es) previas para {args.email}")

    result = AdminServices().add_client(
        schemas.AddClientRequest(name=args.name, email=args.email, plan=args.plan)
    )

    print("OK")
    print(f"session_id={result.session_id}")
    print(f"password={result.password}")
    print(f"expires_at={result.expires_at}")
    print(f"email={result.email}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
