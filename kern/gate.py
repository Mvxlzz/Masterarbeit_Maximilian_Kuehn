"""Vorgelagertes Gate und Zulässigkeit der Alternativen (Abschnitte 4.1.4 und 4.2.4)."""
from .parameter import ALTERNATIVEN, Fall


def zulaessige_alternativen(fall: Fall) -> tuple[list[str], dict[str, str]]:
    """Liefert die zulässigen Alternativen und je ausgeschlossener Alternative den Grund."""
    raus: dict[str, str] = {}
    if not fall.bauteil_aufbereitbar:
        raus["intern"] = raus["extern"] = "Bauteil in der vorgelagerten Eignungsprüfung nicht wiederaufbereitbar"
    if fall.ersatzbedarf:
        raus["ausscheiden"] = "Ersatzbedarf besteht, Ausscheiden stellt kein einsatzfähiges Bauteil bereit"
    else:
        raus["neuteil"] = "kein Ersatzbedarf, Beschaffung eines Neuteils gegenstandslos"
    if not fall.neuteil_verfuegbar and "neuteil" not in raus:
        raus["neuteil"] = "Neuteil nicht verfügbar"
    return [a for a in ALTERNATIVEN if a not in raus], raus
