"""Einparameter-Variation und Kipppunkte (Abschnitt 4.5).

Variiert wird entweder ein Parameter (Name aus referenzparameter) oder ein Dimensionsgewicht
("w_tech", "w_oekon", "w_oekol"). Bei einem Dimensionsgewicht verteilt sich der Rest im
bisherigen Verhältnis auf die beiden anderen Dimensionen.
"""
from __future__ import annotations

from .bewertung import Ergebnis, bewerte
from .parameter import Fall, Gewichte, Param, mit


def auswerten(fall: Fall, params: dict[str, Param], g: Gewichte, groesse: str, x: float) -> Ergebnis:
    if groesse.startswith("w_"):
        return bewerte(fall, params, g.mit_dimensionsgewicht(groesse[2:], x))
    return bewerte(fall, mit(params, **{groesse: x}), g)


def verlauf(fall, params, g, groesse, xs):
    return [(x, auswerten(fall, params, g, groesse, x).nutzwert) for x in xs]


def kipppunkt(fall, params, g, groesse, lo, hi, a, b, schritte=400, tol=1e-9):
    """Erster Wert in [lo, hi], an dem sich die Reihenfolge von a und b umkehrt, sonst None."""
    def diff(x):
        s = auswerten(fall, params, g, groesse, x).nutzwert
        return s[a] - s[b]

    return _vorzeichenwechsel(diff, lo, hi, schritte, tol)


def _vorzeichenwechsel(diff, lo, hi, schritte=400, tol=1e-9):
    """Schrittweise Suche nach einem Vorzeichenwechsel, dann Intervallhalbierung (Abschnitt 4.5.1)."""
    x0, d0 = lo, diff(lo)
    for i in range(1, schritte + 1):
        x1 = lo + (hi - lo) * i / schritte
        d1 = diff(x1)
        if d0 == 0:
            return x0
        if d0 * d1 < 0:
            u, w = x0, x1
            for _ in range(100):
                m = (u + w) / 2
                if diff(u) * diff(m) <= 0:
                    w = m
                else:
                    u = m
                if w - u < tol:
                    break
            return (u + w) / 2
        x0, d0 = x1, d1
    return None


# ---------------------------------------------------------------- Fallmodell (Baukasten)
# Größe ist ein Feldname oder ein Dimensionsgewicht ("w_tech", "w_oekon", "w_oekol").
GEWICHTE = ("w_tech", "w_oekon", "w_oekol")
GLEICHSTAND = 1e-9  # Abstand darunter gilt im Gewichtsdreieck als Gleichstand (Rundung der Gleitkommazahlen)

def auswerten_modell(m, groesse: str, x: float, szenario=None):
    from .modell import bewerte_modell, mit_dimensionsgewicht
    if groesse in GEWICHTE:
        sz = m.szenario(szenario) if isinstance(szenario, str) else szenario
        g = (sz.gewichte if sz and sz.gewichte else None) or m.gewichte
        return bewerte_modell(m, szenario, gewichte=mit_dimensionsgewicht(g, groesse[2:], x))
    return bewerte_modell(m, szenario, ueberschreibungen={groesse: x})


def verlauf_modell(m, groesse, xs, szenario=None):
    """Gesamtnutzwerte über einer Größe. Ausgeschlossene Alternativen fehlen im jeweiligen Punkt."""
    return [(x, auswerten_modell(m, groesse, x, szenario).nutzwert) for x in xs]


def kipppunkt_modell(m, groesse, lo, hi, a, b, szenario=None, schritte=400, tol=1e-9):
    """Erster Wert in [lo, hi], an dem sich die Reihenfolge von a und b umkehrt, sonst None."""
    def diff(x):
        s = auswerten_modell(m, groesse, x, szenario).nutzwert
        if a not in s or b not in s:
            return float("nan")
        return s[a] - s[b]
    return _vorzeichenwechsel(diff, lo, hi, schritte, tol)


def raster(lo: float, hi: float, punkte: int) -> list[float]:
    """Gleichmäßiges Raster mit `punkte` Werten von lo bis hi einschließlich (Verlauf, Kipppunkt-Karte)."""
    if punkte < 2:
        raise ValueError("Ein Raster braucht mindestens zwei Punkte.")
    return [lo + (hi - lo) * i / (punkte - 1) for i in range(punkte)]


def paarabstand(m, a: str, b: str, szenario=None) -> float:
    """Gesamtnutzwert a minus Gesamtnutzwert b bei den aktuellen Werten (Bezugslinie des Tornados).
    NaN, wenn a oder b ausgeschlossen ist."""
    from .modell import bewerte_modell
    e = bewerte_modell(m, szenario)
    return e.nutzwert.get(a, float("nan")) - e.nutzwert.get(b, float("nan"))


def tornado(m, a: str, b: str, szenario=None, felder=None):
    """Einparameter-Variation wie Tabelle 19: jedes Feld mit Spanne allein auf Unter- und Obergrenze.
    Liefert (feld, untergrenze, obergrenze, abstand_unten, abstand_oben) absteigend nach Spannweite.
    Abstand = Gesamtnutzwert a minus Gesamtnutzwert b."""
    def abstand(e):
        return e.nutzwert.get(a, float("nan")) - e.nutzwert.get(b, float("nan"))

    zeilen = []
    for f in m.felder:
        if not f.spanne or (felder is not None and f.name not in felder):
            continue
        lo, hi = f.spanne
        zeilen.append((f.name, lo, hi, abstand(auswerten_modell(m, f.name, lo, szenario)),
                       abstand(auswerten_modell(m, f.name, hi, szenario))))
    zeilen.sort(key=lambda z: abs(z[4] - z[3]), reverse=True)
    return zeilen


def kipppunkt_karte(m, feld_x, xs, feld_y, ys, szenario=None):
    """Rang 1 auf einem Raster aus zwei Größen. Zeigt Wechselwirkungen, die die Einparameter-Variation
    nicht erfasst (Abschnitt 4.5.5). Liefert eine Liste von Zeilen (je y) mit dem Schlüssel von Rang 1."""
    from .modell import bewerte_modell
    karte = []
    for y in ys:
        zeile = []
        for x in xs:
            if feld_x in GEWICHTE or feld_y in GEWICHTE:
                raise ValueError("Die Kipppunkt-Karte variiert Felder, keine Gewichte.")
            e = bewerte_modell(m, szenario, ueberschreibungen={feld_x: x, feld_y: y})
            zeile.append(e.rangfolge[0] if e.rangfolge else None)
        karte.append(zeile)
    return karte


def gewichtsdreieck(m, schritte: int, szenario=None):
    """Rang 1 auf einem Raster über die drei Dimensionsgewichte mit w_tech + w_oekon + w_oekol = 1
    (Schrittweite 1/schritte). Zeigt, bei welchen Gewichten welche Alternative vorn liegt (PRD, Abschnitt 8).
    Liefert je Punkt (w_tech, w_oekon, w_oekol, rang_1, abstand). abstand ist der Abstand von Rang 1 zu
    Rang 2 in Punkten, 0 bei Gleichstand, None bei weniger als zwei zulässigen Alternativen."""
    from .modell import bewerte_modell
    if schritte < 1:
        raise ValueError("Das Gewichtsdreieck braucht mindestens einen Schritt.")
    punkte = []
    for i in range(schritte + 1):
        for j in range(schritte + 1 - i):
            g = {"tech": i / schritte, "oekon": j / schritte, "oekol": (schritte - i - j) / schritte}
            e = bewerte_modell(m, szenario, gewichte=g)
            d = e.abstand()
            punkte.append((g["tech"], g["oekon"], g["oekol"], e.rangfolge[0] if e.rangfolge else None,
                           0.0 if d is not None and abs(d) < GLEICHSTAND else d))
    return punkte
