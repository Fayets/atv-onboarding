"""Fuente única de verdad de los programas de ATV.

Si se agrega o renombra un plan, se toca acá y en frontend/src/constants/plans.js.
"""

# Programas que se pueden vender hoy desde /add-client, en el orden del comando.
PLANS: tuple[str, ...] = (
    "Entry Level",
    "Mid Level",
    "High Level",
    "Boost",
    "Mentoría",
)

# Programas que ya no se venden pero existen en sesiones viejas (dashboard, reenvíos).
LEGACY_PLANS: frozenset[str] = frozenset({"Advantage"})

VALID_PLANS: frozenset[str] = frozenset(PLANS)

# Contrato que firma cada plan en ZapSign. Boost y Mentoría ya no se venden:
# Boost firma el de High Level y Mentoría el de Entry Level (decisión de Franco, 7-10-2026).
CONTRACT_BY_PLAN: dict[str, str] = {
    "Entry Level": "entry",
    "Mid Level": "mid",
    "High Level": "high",
    "Boost": "high",
    "Mentoría": "entry",
}

# Modalidades de pago que figuran en los contratos (cláusula tercera).
PAYMENT_MODES: tuple[str, ...] = ("Pago único", "Dos cuotas", "Tres cuotas")

# Contratos de pago único: no llevan la variable MODALIDAD_PAGO.
SINGLE_PAYMENT_CONTRACTS: frozenset[str] = frozenset({"high"})

CONTRACT_LABELS: dict[str, str] = {
    "entry": "Contrato Entry Level ATV",
    "mid": "Contrato Mid Level ATV",
    "high": "Contrato High Level ATV",
}

# Discord: categoría donde se crea el canal privado (se busca por substring,
# sin distinguir mayúsculas) y rol que recibe el cliente al entrar.
# Entry, Mid y High heredan las categorías actuales hasta que se definan propias.
DISCORD_CATEGORY_BY_PLAN: dict[str, str] = {
    "Entry Level": "canales privados principiantes",
    "Mid Level": "canales privados avanzados",
    "High Level": "canales atv boost",
    "Boost": "canales atv boost",
    "Mentoría": "canales privados avanzados",
    "Advantage": "canales atv advantage",
}

DISCORD_ROLE_BY_PLAN: dict[str, str] = {
    "Entry Level": "Principiantes",
    "Mid Level": "Principiantes",
    "High Level": "Boost",
    "Boost": "Boost",
    "Mentoría": "Principiantes",
    "Advantage": "Advantage",
}
