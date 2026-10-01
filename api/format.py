"""Deutsches Zahlenformat für alle Anzeigen.

Die Oberfläche formatiert Zahlen ausschließlich über diese Funktionen, nie mit f"{x:.2f}".
"""
from __future__ import annotations

import math

LEER = "—"
UNBEGRENZT = "keine Obergrenze"
OHNE_EINHEIT = ("", "—")

CO2 = "kg CO₂-Äq"


def zahl(x: float | None, stellen: int = 2) -> str:
    """1196.853 -> '1.196,85'. None und NaN -> '—', unendlich -> 'keine Obergrenze'."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return LEER
    if math.isinf(x):
        return UNBEGRENZT if x > 0 else f"-{UNBEGRENZT}"
    if round(x, stellen) == 0:
        x = 0.0  # kein "-0,00"
    s = f"{x:,.{stellen}f}"
    return s.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def mit_einheit(x: float | None, einheit: str, stellen: int = 2) -> str:
    """Wert mit Einheit, z. B. '11,45 €/kg'. Dimensionslose Größen ('—') ohne Einheit."""
    s = zahl(x, stellen)
    if einheit in OHNE_EINHEIT or s in (LEER, UNBEGRENZT):
        return s
    return f"{s} {einheit}"


def euro(x: float | None) -> str:
    return mit_einheit(x, "€", 2)


def punkte(x: float | None) -> str:
    return mit_einheit(x, "Punkte", 2)


def co2(x: float | None) -> str:
    return mit_einheit(x, CO2, 2)


def gewicht(x: float | None) -> str:
    return zahl(x, 3)


def kompakt(x: float | None, einheit: str = "", stellen: int = 6) -> str:
    """Bis zu sechs Nachkommastellen ohne Nullen am Ende, für Spannen und Hinweise. 0.5508 -> '0,5508'."""
    s = zahl(x, stellen)
    if "," in s:
        s = s.rstrip("0").rstrip(",")
    if einheit in OHNE_EINHEIT or s in (LEER, UNBEGRENZT):
        return s
    return f"{s} {einheit}"


def rechenwert(x: float | None, einheit: str = "") -> str:
    """Wert im Rechenweg: bis zu vier Nachkommastellen ohne Nullen am Ende. 1.0638297 -> '1,0638', 0.94 -> '0,94', 1196.8534 -> '1.196,8534'."""
    return kompakt(x, einheit, 4)


def eingabe(x: float) -> str:
    """Wert für ein Eingabefeld: wie kompakt(), aber ohne Tausenderpunkt, damit lesen() den Text
    eindeutig zurückliest. 1196.85 -> '1196,85'."""
    if math.isinf(x):
        return UNBEGRENZT
    return kompakt(x).replace(".", "")


def lesen(text: str) -> float:
    """Liest eine Zahl aus einem Eingabefeld.

    Mit Komma gilt das deutsche Format ('1.196,85'). Ohne Komma gilt ein Punkt als Dezimalpunkt
    ('11.45'), damit ein Tippfehler nach dem Neuformatieren sichtbar wird. 'keine Obergrenze',
    'unbegrenzt' und '∞' ergeben unendlich.
    """
    s = text.strip().replace(" ", "").replace(" ", "")
    if s.lower() in ("keineobergrenze", "unbegrenzt", "∞"):
        return math.inf
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        x = float(s)
    except ValueError:
        raise ValueError(f"„{text.strip()}“ ist keine Zahl.") from None
    if math.isnan(x) or math.isinf(x):
        raise ValueError(f"„{text.strip()}“ ist keine Zahl.")
    return x


def kipppunkt(x: float | None, einheit: str = "") -> str:
    """Kipppunkt wie in REFERENZWERTE.md, Abschnitt 3: unter 10 drei Nachkommastellen (0,800), sonst zwei
    (35,01 €/Arbeitstag)."""
    stellen = 3 if x is not None and abs(x) < 10 else 2
    return mit_einheit(x, einheit, stellen)


def differenz(x: float | None, einheit: str = "Punkte", stellen: int = 2) -> str:
    """Differenz mit Vorzeichen: 4.7945 -> '+4,79 Punkte', -2.1 -> '−2,10 Punkte', 0 -> '±0,00 Punkte'."""
    s = zahl(x, stellen)
    if s == LEER:
        return s
    if s.startswith("-"):
        s = "−" + s[1:]
    elif s.strip("0,.") == "":
        s = "±" + s
    else:
        s = "+" + s
    return s if einheit in OHNE_EINHEIT else f"{s} {einheit}"


def prozent(anteil: float | None, stellen: int = 1) -> str:
    """Anteil als Prozent: 0.06 -> '6,0 %'."""
    if anteil is None:
        return LEER
    return mit_einheit(anteil * 100, "%", stellen)
