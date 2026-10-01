"""Export: Felder mit Herkunft und alle Ergebniswerte als CSV,
das Modell als JSON (api/schema.py).

CSV mit Semikolon, Dezimalkomma und UTF-8 mit BOM, damit ein deutsches Excel die Datei direkt richtig öffnet.
Zahlen ungerundet über roh. Die Ergebniswerte stammen aus kern.modell.vergleich_szenarien, hier wird nichts
gerechnet.

Nur das Standardmodul csv, weder pandas noch api.format, damit die
Vercel-Funktion schlank bleibt. Zeilenende „\n“.
"""
from __future__ import annotations

import csv
import io
import math

from api.katalog import HERKUNFT
from kern.modell import DIMENSIONEN, Fallmodell, vergleich_szenarien

TRENNER = ";"
KODIERUNG = "utf-8-sig"
UNBEGRENZT = "keine Obergrenze"


def roh(x: float | None) -> str:
    """Ungerundeter Wert für den CSV-Export (E21): Dezimalkomma, kein Tausenderpunkt, bis 15 signifikante Stellen.
    1196.8534… -> '1196,85339…', 0.5508 -> '0,5508', unendlich -> 'keine Obergrenze', None -> ''."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return ""
    if math.isinf(x):
        return UNBEGRENZT if x > 0 else f"-{UNBEGRENZT}"
    return format(float(x), ".15g").replace(".", ",")


def _csv(zeilen: list[dict], spalten: list[str]) -> bytes:
    puffer = io.StringIO()
    schreiber = csv.DictWriter(puffer, fieldnames=spalten, delimiter=TRENNER, lineterminator="\n", restval="",
                               extrasaction="raise")
    schreiber.writeheader()
    schreiber.writerows(zeilen)
    return puffer.getvalue().encode(KODIERUNG)


FELDER = ["Name", "Bezeichnung", "Wert", "Einheit", "Herkunft", "Quelle", "Spanne von", "Spanne bis", "Gruppe"]


def felder_zeilen(m: Fallmodell) -> list[dict]:
    return [{"Name": f.name, "Bezeichnung": f.bezeichnung, "Wert": roh(f.wert), "Einheit": f.einheit,
             "Herkunft": f"{HERKUNFT.get(f.herkunft, f.herkunft)} ({f.herkunft})", "Quelle": f.quelle,
             "Spanne von": roh(f.spanne[0]) if f.spanne else "",
             "Spanne bis": roh(f.spanne[1]) if f.spanne else "", "Gruppe": f.gruppe} for f in m.felder]


def felder_csv(m: Fallmodell) -> bytes:
    return _csv(felder_zeilen(m), FELDER)


ERGEBNISSE = ["Szenario", "Szenario-Name", "Alternative", "Zulässig", "Ausschlussgrund", "w_tech", "w_oekon", "w_oekol",
              "Kosten [€]", "Treibhauspotenzial [kg CO₂-Äq]", "Dimensionswert technisch [Skala 1–5]",
              *(f"Punkte {name} [Punkte]" for name in DIMENSIONEN.values()),
              *(f"Beitrag {name} [Punkte]" for name in DIMENSIONEN.values()),
              "Gesamtnutzwert [Punkte]", "Rang", "Differenz zum Basisfall [Punkte]"]


def ergebnis_zeilen(m: Fallmodell) -> list[dict]:
    """Je Basisfall und Szenario eine Zeile je Alternative. Ausgeschlossene mit Grund und leeren Werten, ein nicht
    auswertbares Szenario mit dem Grund in „Ausschlussgrund“."""
    zeilen = []
    for v in vergleich_szenarien(m):
        kopf = {"Szenario": v.szenario.schluessel if v.szenario else "Basisfall",
                "Szenario-Name": v.szenario.name if v.szenario else "ohne Einflussfaktoren"}
        e = v.ergebnis
        if e is None:
            zeilen.append({**kopf, "Zulässig": "nein", "Ausschlussgrund": f"nicht auswertbar: {v.fehler}"})
            continue
        gewichte = {f"w_{d}": roh(e.gewichte[d]) for d in DIMENSIONEN}
        for a in m.alternativen:
            s = a.schluessel
            z = {**kopf, "Alternative": a.name, **gewichte}
            if s not in e.nutzwert:
                zeilen.append({**z, "Zulässig": "nein", "Ausschlussgrund": e.ausgeschlossen.get(s, "")})
                continue
            z.update({"Zulässig": "ja", "Ausschlussgrund": "", "Kosten [€]": roh(e.kosten[s]),
                      "Treibhauspotenzial [kg CO₂-Äq]": roh(e.co2[s]),
                      "Dimensionswert technisch [Skala 1–5]": roh(e.s_tech[s]),
                      "Punkte technisch [Punkte]": roh(e.n_tech[s]),
                      "Punkte ökonomisch [Punkte]": roh(e.n_oekon[s]),
                      "Punkte ökologisch [Punkte]": roh(e.n_oekol[s]),
                      **{f"Beitrag {name} [Punkte]": roh(e.beitrag[s][d]) for d, name in DIMENSIONEN.items()},
                      "Gesamtnutzwert [Punkte]": roh(e.nutzwert[s]), "Rang": str(e.rangfolge.index(s) + 1),
                      "Differenz zum Basisfall [Punkte]": roh(v.differenz.get(s))})
            zeilen.append(z)
    return zeilen


def ergebnisse_csv(m: Fallmodell) -> bytes:
    return _csv(ergebnis_zeilen(m), ERGEBNISSE)
