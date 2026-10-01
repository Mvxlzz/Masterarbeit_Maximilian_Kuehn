"""Technische Dimension nach Abschnitt 4.3.1, Formeln (5) und (6)."""
from .matching import schadensgrad_score, werkstoffeignung
from .parameter import Fall, Gewichte

UNTERKRITERIEN = ("technologie", "prozess", "schadensgrad", "werkstoff")


def unterkriterien(fall: Fall, alternative: str) -> dict[str, int] | None:
    """Bewertungen der vier Unterkriterien (Tabelle 9). None für Neuteil und Ausscheiden."""
    if alternative not in ("intern", "extern"):
        return None
    return {
        "technologie": fall.tv_intern if alternative == "intern" else fall.tv_extern,
        "prozess": fall.pf_intern if alternative == "intern" else fall.pf_extern,
        "schadensgrad": schadensgrad_score(fall.schadensgrad),
        "werkstoff": werkstoffeignung(fall.schadenstyp, fall.werkstoffklasse, fall.eignungstabelle),
    }


def dimensionswert(s: dict[str, int] | None, g: Gewichte, neuteil_hoechstwert: float = 5.0) -> float:
    """Formel (5). Neuteil und Ausscheiden erhalten den Höchstwert (Konvention aus 4.3.1)."""
    if s is None:
        return neuteil_hoechstwert
    return sum(getattr(g, k) * s[k] for k in UNTERKRITERIEN)


def ko(s: dict[str, int] | None) -> bool:
    """Technisches Ausschlusskriterium der zweiten Ebene: ein Unterkriterium auf Stufe 1."""
    return s is not None and min(s.values()) <= 1


def punkte(s_tech: float) -> float:
    """Formel (6): absolute Überführung der fünfstufigen Skala auf 0 bis 100."""
    return (s_tech - 1) / 4 * 100
