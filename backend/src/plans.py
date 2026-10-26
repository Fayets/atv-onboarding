"""Fuente única de los programas de ATV.

Mentoría y Entry Level son lo mismo con distinto nombre (igual Boost y High Level): conviven porque
hay clientes con los dos nombres. Advantage ya no se vende pero existe en sesiones viejas.
Si se agrega o renombra un plan, se toca acá y en frontend/src/constants/plans.js.
"""

PLANS: tuple[str, ...] = ("Entry Level", "Mid Level", "High Level", "Boost", "Mentoría", "2K")
# 2K (backend offer, 26-10-2026): sin Discord ni chat; el alta se hace solo desde el classroom.
PLANS_WITHOUT_DISCORD: frozenset[str] = frozenset({"2K"})
DISCORD_PLANS: tuple[str, ...] = tuple(p for p in PLANS if p not in PLANS_WITHOUT_DISCORD)
LEGACY_PLANS: frozenset[str] = frozenset({"Advantage"})
VALID_PLANS: frozenset[str] = frozenset(PLANS)

# Contrato que firma cada plan en ZapSign (decisión de Franco, 7-10-2026):
# Boost firma el de High Level y Mentoría el de Entry Level.
CONTRACT_BY_PLAN: dict[str, str] = {
    "Entry Level": "entry",
    "Mid Level": "mid",
    "High Level": "high",
    "Boost": "high",
    "Mentoría": "entry",
    "2K": "2k",
}

# Modalidades de pago que figuran en los contratos (cláusula tercera). Las elige el closer en /add-client.
PAYMENT_MODES: tuple[str, ...] = ("Pago único", "Dos cuotas", "Tres cuotas")

# Contratos de pago único: no llevan la variable MODALIDAD_PAGO.
SINGLE_PAYMENT_CONTRACTS: frozenset[str] = frozenset({"high", "2k"})  # el 2K trae sus cuotas fijas en el texto

CONTRACT_LABELS: dict[str, str] = {
    "entry": "Contrato Entry Level ATV",
    "mid": "Contrato Mid Level ATV",
    "high": "Contrato High Level ATV",
    "2k": "Contrato 2K ATV",
}

# Discord: categoría donde se crea el canal privado (substring, sin mayúsculas) y rol del cliente.
# Entry, Mid y High usan las categorías actuales hasta que tengan propias.
DISCORD_CATEGORY_BY_PLAN: dict[str, str] = {
    "Entry Level": "canales privados avanzados",
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
