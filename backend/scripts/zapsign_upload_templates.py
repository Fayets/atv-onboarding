"""Sube los contratos DOCX a ZapSign como plantillas y configura su formulario.

Uso (desde backend/, con el .env cargado):
    python scripts/zapsign_upload_templates.py            # sube los que falten en .env
    python scripts/zapsign_upload_templates.py --force    # vuelve a subir los tres

Imprime las variables ZAPSIGN_TEMPLATE_* para pegar en el .env. No crea documentos,
así que no consume créditos del plan API.
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from decouple import config  # noqa: E402

from src.plans import CONTRACT_LABELS  # noqa: E402
from src.services.zapsign_service import ZapSignService  # noqa: E402

CONTRATOS_DIR = ROOT.parent / "contratos"
FILES = {
    "entry": "Contrato ENTRY LEVEL ATV.docx",
    "mid": "Contrato MID LEVEL ATV.docx",
    "high": "Contrato HIGH LEVEL ATV.docx",
    "2k": "Contrato 2K ATV.docx",
}

# Lo que ve el cliente en ZapSign antes de firmar. Lo precargado por el onboarding
# (nombre, fecha, mails, modalidad) ya viene lleno; lo demás lo completa él.
FORM_INPUTS = [
    {"variable": "{{DOCUMENTO}}", "label": "DNI o número de pasaporte", "input_type": "input", "required": True, "order": 1,
     "help_text": "Tal como figura en tu documento."},
    {"variable": "{{CALLE}}", "label": "Calle y número", "input_type": "input", "required": True, "order": 2},
    {"variable": "{{CIUDAD}}", "label": "Ciudad", "input_type": "input", "required": True, "order": 3},
    {"variable": "{{PROVINCIA}}", "label": "Provincia o estado", "input_type": "input", "required": True, "order": 4},
    {"variable": "{{PAIS}}", "label": "País", "input_type": "input", "required": True, "order": 5},
    {"variable": "{{NOMBRE_COMPLETO}}", "label": "Nombre completo (ya cargado por ATV)", "input_type": "signer_fullname", "required": True, "order": 6},
    {"variable": "{{EMAIL_CONTRATANTE}}", "label": "Tu email (ya cargado por ATV)", "input_type": "email", "required": True, "order": 7},
    {"variable": "{{DIA}}", "label": "Día de firma (ya cargado por ATV)", "input_type": "input", "required": True, "order": 8},
    {"variable": "{{MES}}", "label": "Mes de firma (ya cargado por ATV)", "input_type": "input", "required": True, "order": 9},
    {"variable": "{{ANIO}}", "label": "Año de firma (ya cargado por ATV)", "input_type": "input", "required": True, "order": 10},
    {"variable": "{{EMAIL_EMPRESA}}", "label": "Email de ATV (ya cargado por ATV)", "input_type": "email", "required": True, "order": 11},
    {"variable": "{{MODALIDAD_PAGO}}", "label": "Modalidad de pago (la pactada con tu closer)", "input_type": "dropdown-list", "required": True, "order": 12,
     "options": "Pago único;Dos cuotas;Tres cuotas"},
]


# El 2K no lleva modalidad: sus tres cuotas están en el texto, con las fechas que pone el onboarding.
FORM_INPUTS_2K = [i for i in FORM_INPUTS if i["variable"] != "{{MODALIDAD_PAGO}}"] + [
    {"variable": "{{" + v + "}}", "label": f"{etiqueta} (ya cargado por ATV)", "input_type": "input", "required": True, "order": 12 + n}
    for n, (v, etiqueta) in enumerate([
        ("FECHA_CUOTA_1", "Primera cuota"), ("FECHA_CUOTA_2", "Segunda cuota"), ("FECHA_CUOTA_3", "Tercera cuota"),
    ])
]


def _texto_docx(path: Path) -> str:
    import zipfile

    return zipfile.ZipFile(path).read("word/document.xml").decode()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-subir aunque ya haya token en .env")
    parser.add_argument("--solo", default="", help="Solo estos contratos, separados por coma (ej. --solo=2k)")
    args = parser.parse_args()

    zs = ZapSignService()
    if not zs.configured:
        print("Falta ZAPSIGN_API_TOKEN en .env")
        return 1

    frontend_url = config("ONBOARDING_FRONTEND_URL", default="").rstrip("/")
    redirect = f"{frontend_url}/?contrato=firmado" if frontend_url else ""
    result: dict[str, str] = {}

    solo = {k.strip() for k in args.solo.split(",") if k.strip()}
    for kind, filename in FILES.items():
        if solo and kind not in solo:
            continue
        env_key = f"ZAPSIGN_TEMPLATE_{kind.upper()}"
        existing = config(env_key, default="").strip()
        if existing and not args.force:
            print(f"{env_key} ya configurado ({existing}); salto. Usá --force para re-subir.")
            result[kind] = existing
            continue

        path = CONTRATOS_DIR / filename
        if not path.exists():
            print(f"No encuentro {path}")
            return 1

        inputs = FORM_INPUTS_2K if kind == "2k" else FORM_INPUTS if kind != "high" else [i for i in FORM_INPUTS if i["variable"] != "{{MODALIDAD_PAGO}}"]
        # Solo los campos que el documento tiene de verdad (el 2K de Máximo trae las fechas de cuota escritas).
        texto = _texto_docx(path)
        inputs = [i for i in inputs if i["variable"] in texto]
        # Si ya hay una plantilla DOCX con este nombre (corrida anterior a medias), se reutiliza.
        previa = next(
            (t for t in zs.list_templates() if t.get("name") == CONTRACT_LABELS[kind] and t.get("template_type") == "docx"),
            None,
        )
        if previa and not args.force:
            token = previa["token"]
            print(f"{CONTRACT_LABELS[kind]}: ya existe en ZapSign ({token}), configuro el formulario.")
        else:
            print(f"Subiendo {filename} ...")
            tpl = zs.create_template_docx(
                name=CONTRACT_LABELS[kind],
                docx_bytes=path.read_bytes(),
                folder_path="/Onboarding ATV",
                redirect_link=redirect,
            )
            token = tpl.get("token")
            print(f"  plantilla creada: {token}")
            print(f"  variables detectadas: {[i.get('variable') for i in tpl.get('inputs', [])]}")
        zs.update_template_form(token, inputs)
        print("  formulario configurado")
        result[kind] = token

    print("\nPegar en .env:")
    for kind, token in result.items():
        print(f"ZAPSIGN_TEMPLATE_{kind.upper()}={token}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
