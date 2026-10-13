"""Fuente única de los programas de ATV (sin el contrato, que vive en la rama zapsign-contrato).

Mentoría y Entry Level son lo mismo con distinto nombre (igual Boost y High Level): conviven porque
hay clientes con los dos nombres. Advantage ya no se vende pero existe en sesiones viejas.
"""

PLANS: tuple[str, ...] = ("Entry Level", "Mid Level", "High Level", "Boost", "Mentoría")
LEGACY_PLANS: frozenset[str] = frozenset({"Advantage"})
VALID_PLANS: frozenset[str] = frozenset(PLANS)

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
