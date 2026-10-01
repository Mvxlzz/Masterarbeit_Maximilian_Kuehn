"""Normalisierung, Gewichtung und Aggregation nach Abschnitt 4.4 und Gesamtablauf.

Ablauf wie Abbildung 4.1: Gate, Bewertung der drei Dimensionen, technisches Ausschlusskriterium,
Normalisierung, gewichtete Summe, Rangfolge.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import faktoren, oekologisch, oekonomisch, technisch
from .gate import zulaessige_alternativen
from .parameter import Fall, Gewichte, Param, werte


def minmax_kosten(x: dict[str, float]) -> dict[str, float]:
    """Min-Max-Normalisierung für Kostenkriterien (Formel 9): geringster Wert 100, höchster 0.
    Konvention bei gleichen Werten: alle 100, die Dimension trennt dann nicht."""
    lo, hi = min(x.values()), max(x.values())
    if hi - lo < 1e-12:
        return {a: 100.0 for a in x}
    return {a: (hi - xi) / (hi - lo) * 100 for a, xi in x.items()}


@dataclass
class Ergebnis:
    alternativen: list[str]
    ausgeschlossen: dict[str, str]
    unterkriterien: dict[str, dict[str, int] | None]
    s_tech: dict[str, float]
    kosten_pos: dict[str, dict[str, float]]
    co2_pos: dict[str, dict[str, float]]
    kosten: dict[str, float]
    co2: dict[str, float]
    n_tech: dict[str, float]
    n_oekon: dict[str, float]
    n_oekol: dict[str, float]
    beitrag: dict[str, dict[str, float]]
    nutzwert: dict[str, float]
    rangfolge: list[str] = field(default_factory=list)
    hinweise: list[str] = field(default_factory=list)

    def abstand(self) -> float | None:
        """Abstand des Gesamtnutzwerts von Rang 1 zu Rang 2, None bei weniger als zwei Alternativen."""
        if len(self.rangfolge) < 2:
            return None
        return self.nutzwert[self.rangfolge[0]] - self.nutzwert[self.rangfolge[1]]


def bewerte(fall: Fall, params: dict[str, Param], g: Gewichte | None = None) -> Ergebnis:
    g = g or Gewichte()
    g.pruefen()
    v = werte(params)

    kandidaten, raus = zulaessige_alternativen(fall)
    unter = {a: technisch.unterkriterien(fall, a) for a in kandidaten}
    for a in kandidaten:
        if technisch.ko(unter[a]):
            raus[a] = "technisches Ausschlusskriterium, ein Unterkriterium auf Stufe 1"
    hinweise: list[str] = []
    if fall.harte_frist:
        verspaetet = [a for a in kandidaten if a not in raus and faktoren.lieferzeit(v, a) > v["frist"]]
        if len(verspaetet) == len([a for a in kandidaten if a not in raus]):
            # Lockerung nach Pinedo (2016, S. 453): hält keine Alternative die harte Frist,
            # wird sie wie eine weiche Frist behandelt und wirkt nur über die Verzugskosten
            hinweise.append("Keine Alternative hält die harte Frist. Sie wird als weiche Frist behandelt.")
        else:
            for a in verspaetet:
                raus[a] = "harte Frist, Lieferzeit überschreitet die Frist"
    alts = [a for a in kandidaten if a not in raus]

    kosten_pos = {a: oekonomisch.kosten(a, v) for a in alts}
    co2_pos = {a: oekologisch.emissionen(a, v) for a in alts}

    # Faktorbausteine, im Basisfall ohne Wirkung
    k_neu = sum(oekonomisch.kosten("neuteil", v).values())
    e_neu = sum(oekologisch.emissionen("neuteil", v).values())
    t_neu = faktoren.lieferzeit(v, "neuteil")
    for a in alts:
        t_a = faktoren.lieferzeit(v, a)
        p = v["ausschuss"] if a in ("intern", "extern") else 0.0
        k_v = (1 - p) * faktoren.verzug(v, t_a) + p * faktoren.verzug(v, t_a + t_neu)
        if k_v:
            kosten_pos[a]["Verzug"] = k_v
        if p:
            kosten_pos[a]["Ausschussrisiko"] = p * k_neu
            co2_pos[a]["Ausschussrisiko"] = p * e_neu

    kosten = {a: sum(kosten_pos[a].values()) for a in alts}
    co2 = {a: sum(co2_pos[a].values()) for a in alts}
    s_tech = {a: technisch.dimensionswert(unter[a], g, fall.s_tech_ohne_verfahren) for a in alts}
    n_tech = {a: technisch.punkte(s_tech[a]) for a in alts}
    n_oekon = minmax_kosten(kosten) if alts else {}
    n_oekol = minmax_kosten(co2) if alts else {}

    beitrag = {a: {"tech": g.tech * n_tech[a], "oekon": g.oekon * n_oekon[a], "oekol": g.oekol * n_oekol[a]}
               for a in alts}
    nutzwert = {a: sum(beitrag[a].values()) for a in alts}
    rang = sorted(alts, key=lambda a: nutzwert[a], reverse=True)
    return Ergebnis(alts, raus, {a: unter[a] for a in alts}, s_tech, kosten_pos, co2_pos, kosten, co2,
                    n_tech, n_oekon, n_oekol, beitrag, nutzwert, rang, hinweise)
