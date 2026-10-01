"""Inhalt der Einführung (Tutorial) für die Web-App über GET /tutorial.

Texte aus api/inhalte/tutorial.py, alle Zahlen aus kern.modell
und kern.sensitivitaet mit dem Referenzmodell, als fertig formatierte Tabellen, Formeln in LaTeX und Schritte des
Rechenwegs. Hier wird nichts Neues gerechnet, nur zusammengestellt und formatiert. Das Tutorial ändert kein
Projekt.
"""
from __future__ import annotations

from functools import lru_cache

from api import format as fmt
from api.inhalte import formeln
from api.inhalte.tutorial import STATIONEN, STUFEN
from api.rechenweg_latex import _tex as tex_zahl
from api.rechenweg_latex import schritt_mit_latex
from kern import sensitivitaet
from kern.modell import (ARTEN_NAMEN, DIMENSIONEN, Fallmodell, ModellErgebnis, bausteine_werte, bewerte_modell,
                         referenzmodell, vergleich_szenarien)

JA_NEIN = {True: "ja", False: "nein"}
RUNDUNG = "Werte mit bis zu vier Nachkommastellen angezeigt, gerechnet wird ungerundet."


def _t(text: str) -> str:
    """Text in LaTeX (\\text{…}), Sonderzeichen der Anzeigenamen maskiert."""
    return r"\text{" + text.replace("\\", "").replace("{", "").replace("}", "").replace("%", r"\%") + "}"


def _namen(m: Fallmodell) -> dict[str, str]:
    return {a.schluessel: a.name for a in m.alternativen}


def _formel(titel: str, abschnitt: str, allgemein: str, eingesetzt: str, ergebnis: str, nummer: str = "",
            erklaerung: str = "", zeichen: list[dict] | None = None) -> dict:
    return {"titel": titel, "nummer": nummer, "abschnitt": abschnitt, "allgemein": allgemein,
            "eingesetzt": eingesetzt, "ergebnis": ergebnis, "erklaerung": erklaerung, "zeichen": zeichen or []}


def _methode(nummer: str) -> dict:
    """Formel der Methode mit Zeichenerklärung (LaTeX-Zeichen, Text mit $…$ für Formelteile)."""
    f = formeln.NACH_NUMMER[nummer]
    return _formel(f.titel, f.abschnitt, f.latex, "", "", nummer=f.nummer, erklaerung=f.hinweis,
                   zeichen=[{"zeichen": z, "text": t} for z, t in f.zeichen])


def _balken(titel: str, einheit: str, werte: dict[str, float]) -> dict:
    """Werte für ein Balkendiagramm, größte zuerst. Die Zahlen stammen unverändert aus dem Ergebnis des Kerns."""
    return {"titel": titel, "einheit": einheit,
            "werte": [{"name": k, "wert": v} for k, v in sorted(werte.items(), key=lambda kv: -kv[1])]}


def _tabelle(titel: str, spalten: list[str], zeilen: list[list[str]], markiert: list[int] | None = None) -> dict:
    """Fertig formatierte Tabelle. Erste Spalte ist die Zeilenbeschriftung, `markiert` hebt Zeilen hervor."""
    return {"titel": titel, "spalten": spalten, "zeilen": zeilen, "markiert": markiert or []}


def _schritte(m: Fallmodell, e: ModellErgebnis, bereich: str, alternative: str | None, bezeichnung: str,
              titel: str) -> dict:
    """Schritte des Rechenwegs zu einer Zahl, mit LaTeX für die Anzeige."""
    gefunden = [s for s in e.rechenweg if (s.bereich, s.alternative, s.bezeichnung) == (bereich, alternative,
                                                                                         bezeichnung)]
    return {"titel": titel, "schritte": [schritt_mit_latex(m, s) for s in gefunden]}


def _eingaben(m: Fallmodell, gruppen: tuple[str, ...]) -> dict | None:
    if not gruppen:
        return None
    zeilen = [[f.bezeichnung, fmt.kompakt(f.wert, f.einheit), f.herkunft, f.quelle,
               (f"{fmt.kompakt(f.spanne[0])} bis {fmt.kompakt(f.spanne[1], f.einheit)}" if f.spanne else fmt.LEER)]
              for f in m.felder if f.gruppe in gruppen]
    return _tabelle("Eingaben dieser Station (nur lesend)", ["Bezeichnung", "Wert", "Herkunft", "Quelle", "Spanne"],
                    zeilen)


def _positionen(m: Fallmodell, e: ModellErgebnis, dimension: str) -> dict:
    """Positionen je Alternative in € oder kg CO₂-Äq, dazu die Summe (Tabellen 14 und 16)."""
    n = _namen(m)
    werte = e.kosten_pos if dimension == "oekon" else e.co2_pos
    summe = e.kosten if dimension == "oekon" else e.co2
    zelle = fmt.euro if dimension == "oekon" else fmt.co2
    bezeichnungen = list(dict.fromkeys(b for a in e.alternativen for b in werte.get(a, {})))
    zeilen = [[b, *(zelle(werte[a][b]) if b in werte.get(a, {}) else fmt.LEER for a in e.alternativen)]
              for b in bezeichnungen]
    zeilen.append(["Summe", *(zelle(summe[a]) for a in e.alternativen)])
    titel = "Kostenpositionen je Alternative" if dimension == "oekon" else "Treibhauspotenzial je Position"
    return _tabelle(titel, ["Position", *(n[a] for a in e.alternativen)], zeilen, [len(zeilen) - 1])


def _s1(m: Fallmodell, e: ModellErgebnis) -> dict:
    n = _namen(m)
    erster = e.rangfolge[0]
    eingesetzt = (r"a^{*} = \arg\max \{" + ",\\ ".join(f"S_{{{_t(n[a])}}} = {tex_zahl(e.nutzwert[a])}"
                                                      for a in e.rangfolge) + r"\} = " + _t(n[erster]))
    return {
        "formeln": [_formel("Entscheidungsregel: Rang 1 hat den höchsten Gesamtnutzwert", "Abschnitt 4.4.3",
                            r"a^{*} = \arg\max_{a \in A_{\text{zul}}} S_a", eingesetzt,
                            f"{n[erster]}, Gesamtnutzwert {fmt.punkte(e.nutzwert[erster])}")],
        "tabellen": [_tabelle(f"Bauteil im Referenzfall: {m.stammdaten.bauteil}, {m.stammdaten.werkstoff}",
                              ["Alternative", "Art"], [[a.name, ARTEN_NAMEN[a.art]] for a in m.alternativen])],
        "schritte": [],
    }


def _s2(m: Fallmodell, e: ModellErgebnis) -> dict:
    g, n = m.gate, _namen(m)
    zulaessig = [[n[a.schluessel], "zulässig" if a.schluessel not in e.ausgeschlossen else "ausgeschlossen",
                  e.ausgeschlossen.get(a.schluessel, "besteht Gate, Ersatzbedarf und Verfügbarkeit")]
                 for a in m.alternativen]
    return {
        "formeln": [_formel("Zulässige Alternativen", "Abschnitte 4.1.4 und 4.2.4",
                            r"A_{\text{zul}} = \{a \in A \mid a \text{ besteht Gate, Ersatzbedarf und Verfügbarkeit}\}",
                            r"A_{\text{zul}} = \{" + ",\\ ".join(_t(n[a]) for a in e.alternativen) + r"\}",
                            f"{len(e.alternativen)} von {len(m.alternativen)} Alternativen zulässig")],
        "tabellen": [
            _tabelle("Gate", ["Angabe", "Wert"],
                     [["Bauteil in der Eignungsprüfung wiederaufbereitbar", JA_NEIN[g.bauteil_aufbereitbar]],
                      ["Ersatzbedarf besteht", JA_NEIN[g.ersatzbedarf]],
                      ["Neuteil verfügbar", JA_NEIN[g.neuteil_verfuegbar]]]),
            _tabelle("Zulässigkeit je Alternative", ["Alternative", "Status", "Grund"], zulaessig,
                     [i for i, z in enumerate(zulaessig) if z[1] == "ausgeschlossen"]),
        ],
        "schritte": [],
    }


def _s3(m: Fallmodell, e: ModellErgebnis) -> dict:
    sd = m.stammdaten
    stufe_grad = m.schadensgrad_score[sd.schadensgrad]
    spalte = m.werkstoffklassen.index(sd.werkstoffklasse)
    stufe_werkstoff = m.eignung[sd.schadenstyp][spalte]
    tabelle5 = [[typ, *(str(x) for x in zeile)] for typ, zeile in m.eignung.items()]
    return {
        "formeln": [_formel(
            "Stufen aus den Hinterlegungstabellen", "Abschnitte 4.2.2 und 4.2.3, Tabellen 3 und 5",
            r"s_{\text{Schaden}} = T_3(\text{Schadensgrad}), \quad s_{\text{Werkstoff}} = "
            r"T_5(\text{Schadenstyp}, \text{Werkstoffklasse})",
            rf"s_{{\text{{Schaden}}}} = T_3({_t(sd.schadensgrad)}) = {stufe_grad}, \quad s_{{\text{{Werkstoff}}}} = "
            rf"T_5({_t(sd.schadenstyp)}, {_t(sd.werkstoffklasse)}) = {stufe_werkstoff}",
            f"Stufe {stufe_grad} und Stufe {stufe_werkstoff}")],
        "tabellen": [
            _tabelle("Schadensbild des Falls", ["Größe", "Angabe"],
                     [["Schadenstyp", sd.schadenstyp], ["Schadensgrad", sd.schadensgrad],
                      ["Werkstoffklasse", sd.werkstoffklasse],
                      ["Beherrschbarkeit des Schadensgrads (Tabelle 3)", f"Stufe {stufe_grad}"],
                      ["Werkstoffeignung (Tabelle 5)", f"Stufe {stufe_werkstoff}"]]),
            _tabelle(f"Tabelle 5: Zeile „{sd.schadenstyp}“, Spalte „{sd.werkstoffklasse}“ gelten für den Fall",
                     ["Schadenstyp", *m.werkstoffklassen], tabelle5, [list(m.eignung).index(sd.schadenstyp)]),
        ],
        "schritte": [],
    }


def _s4(m: Fallmodell, e: ModellErgebnis) -> dict:
    n = _namen(m)
    zeilen = [[f"{u.name} (Gewicht {fmt.gewicht(u.gewicht)})",
               *((str(e.unterkriterien[a][u.schluessel]) if e.unterkriterien.get(a) else fmt.LEER)
                 for a in e.alternativen)] for u in m.unterkriterien]
    zeilen.append(["Dimensionswert technisch (Skala 1 bis 5)", *(fmt.zahl(e.s_tech[a]) for a in e.alternativen)])
    zeilen.append(["Punkte technisch", *(fmt.zahl(e.n_tech[a]) for a in e.alternativen)])
    a = e.rangfolge[0]
    return {
        "formeln": [],
        "tabellen": [_tabelle("Stufen der Unterkriterien je Alternative", ["Unterkriterium",
                                                                            *(n[x] for x in e.alternativen)],
                              zeilen, [len(zeilen) - 2, len(zeilen) - 1])],
        "schritte": [_schritte(m, e, "technik", a, "Dimensionswert technisch", f"Dimensionswert technisch, {n[a]}"),
                     _schritte(m, e, "technik", a, "Punkte technisch", f"Punkte technisch, {n[a]}")],
    }


def _s5(m: Fallmodell, e: ModellErgebnis) -> dict:
    a = e.rangfolge[0]
    return {
        "formeln": [],
        "balken": _balken(f"Kostenpositionen, {_namen(m)[a]}, größte zuerst", "€", e.kosten_pos[a]),
        "tabellen": [_positionen(m, e, "oekon")],
        "schritte": [_schritte(m, e, "position", a, "Materialauftrag, Arbeit und Anlage",
                               f"Eine Position: Materialauftrag, Arbeit und Anlage, {_namen(m)[a]}")],
    }


def _s6(m: Fallmodell, e: ModellErgebnis) -> dict:
    a = e.rangfolge[0]
    n = _namen(m)
    return {
        "formeln": [_methode("(8)")],
        "balken": _balken("Treibhauspotenzial gesamt je Alternative", fmt.CO2, {n[x]: e.co2[x] for x in e.alternativen}),
        "tabellen": [_positionen(m, e, "oekol")],
        "schritte": [_schritte(m, e, "summe", a, "Treibhauspotenzial gesamt",
                               f"Treibhauspotenzial gesamt, {_namen(m)[a]}")],
    }


def _s7(m: Fallmodell, e: ModellErgebnis) -> dict:
    n = _namen(m)
    zweiter = e.rangfolge[1]
    return {
        "formeln": [],
        "tabellen": [_tabelle("Gewichte der Dimensionen", ["Dimension", "Gewicht"],
                              [[f"Dimension {name}", fmt.gewicht(e.gewichte[d])] for d, name in DIMENSIONEN.items()])],
        "schritte": [
            _schritte(m, e, "normalisierung", zweiter, "Punkte ökonomisch",
                      f"Punkte ökonomisch, {n[zweiter]} (liegt zwischen günstigster und teuerster Alternative)"),
            _schritte(m, e, "austauschrate", None, "Implizite Austauschrate",
                      "Implizite Austauschrate (Abschnitt 4.4.2)"),
        ],
    }


def _s8(m: Fallmodell, e: ModellErgebnis) -> dict:
    n = _namen(m)
    erster = e.rangfolge[0]
    zeilen = [
        ["Technischer Dimensionswert [Skala 1–5]", *(fmt.zahl(e.s_tech[a]) for a in e.alternativen)],
        ["Kosten [€]", *(fmt.zahl(e.kosten[a]) for a in e.alternativen)],
        [f"Treibhauspotenzial [{fmt.CO2}]", *(fmt.zahl(e.co2[a]) for a in e.alternativen)],
        *([f"Punkte {name} [Punkte]", *(fmt.zahl(getattr(e, f"n_{d}")[a]) for a in e.alternativen)]
          for d, name in DIMENSIONEN.items()),
        *([f"Beitrag {name} [Punkte]", *(fmt.zahl(e.beitrag[a][d]) for a in e.alternativen)]
          for d, name in DIMENSIONEN.items()),
        ["Gesamtnutzwert [Punkte]", *(fmt.zahl(e.nutzwert[a]) for a in e.alternativen)],
        ["Rang", *(str(e.rangfolge.index(a) + 1) for a in e.alternativen)],
    ]
    return {
        "formeln": [],
        "tabellen": [_tabelle("Rohwerte, Punkte und Beiträge (Tabellen 17 und 18)",
                              ["Größe", *(n[a] for a in e.alternativen)], zeilen, [len(zeilen) - 2])],
        "schritte": [_schritte(m, e, "nutzwert", erster, "Gesamtnutzwert", f"Gesamtnutzwert, {n[erster]}")],
    }


def _s9(m: Fallmodell, e: ModellErgebnis) -> dict:
    n = _namen(m)
    kipp = []
    for i, x in enumerate(e.alternativen):
        for y in e.alternativen[i + 1:]:
            w = sensitivitaet.kipppunkt_modell(m, "w_tech", 0.0, 1.0, x, y)
            if w is not None:
                kipp.append((x, y, w))
    kipp.sort(key=lambda k: k[2])
    formel = []
    if kipp:
        formel.append(_formel(
            "Kipppunkt: zwei Alternativen erreichen denselben Gesamtnutzwert", "Abschnitt 4.5.3",
            r"S_a(w^{*}) = S_b(w^{*})",
            r",\quad ".join(rf"S_{{{_t(n[x])}}}(w^{{*}}) = S_{{{_t(n[y])}}}(w^{{*}}) \Rightarrow "
                            rf"w^{{*}}_{{\text{{tech}}}} = {tex_zahl(w)}" for x, y, w in kipp),
            " und ".join(fmt.kipppunkt(w) for _, _, w in kipp)))
    return {
        "formeln": formel,
        "tabellen": [_tabelle("Kipppunkte des technischen Gewichts", ["Paar", "Kipppunkt w_tech"],
                              [[f"{n[x]} / {n[y]}", fmt.kipppunkt(w)] for x, y, w in kipp])] if kipp else [],
        "schritte": [],
        "kipppunkte": [{"a": x, "b": y, "x": w} for x, y, w in kipp],
    }


def _s10(m: Fallmodell, e: ModellErgebnis) -> dict:
    n = _namen(m)
    s2 = m.szenario("S2")
    werte = bausteine_werte(m, s2.schluessel)
    e2 = bewerte_modell(m, s2.schluessel)
    bausteine = [["Frist", fmt.mit_einheit(werte["frist"], "Arbeitstage")],
                 *([f"Lieferzeit {n[a]}", fmt.mit_einheit(werte[f"lieferzeit:{a}"], "Arbeitstage")]
                   for a in ("intern", "extern", "neuteil")),
                 ["Vertragsstrafe je Arbeitstag", fmt.mit_einheit(werte["strafe_tag"], "€/Arbeitstag")],
                 ["Obergrenze der Vertragsstrafe", fmt.mit_einheit(werte["strafe_max"], "€")]]
    vergleich = vergleich_szenarien(m)
    zeilen, anders = [], []
    for i, v in enumerate(vergleich):
        titel = f"{v.szenario.schluessel} {v.szenario.name}" if v.szenario else "Basisfall"
        if v.ergebnis is None:
            zeilen.append([titel, fmt.LEER, *(fmt.LEER for _ in e.alternativen)])
            continue
        erster = n[v.ergebnis.rangfolge[0]] if v.ergebnis.rangfolge else fmt.LEER
        zeilen.append([titel, erster, *(fmt.zahl(v.ergebnis.nutzwert[a]) if a in v.ergebnis.nutzwert else fmt.LEER
                                        for a in e.alternativen)])
        if v.anderer_sieger:
            anders.append(i)
    return {
        "formeln": [_methode("(11)"), _methode("(12)"), _methode("(13)")],
        "tabellen": [
            _tabelle(f"Faktorbausteine im Szenario {s2.schluessel} {s2.name}", ["Baustein", "Wert"], bausteine),
            _tabelle("Szenarien S0 bis S11: Rang 1 und Gesamtnutzwerte [Punkte]",
                     ["Szenario", "Rang 1", *(n[a] for a in e.alternativen)], zeilen, anders),
        ],
        "schritte": [_schritte(m, e2, "baustein", "intern", "Verzug",
                               f"Verzug, {n['intern']}, Szenario {s2.schluessel} (Formeln 11 und 12)")],
        "satz": (f"In {len(anders)} von {len(vergleich) - 1} Szenarien liegt eine andere Alternative als im Basisfall "
                 f"auf Rang 1: {', '.join(zeilen[i][0] for i in anders)}."),
    }


_STATIONEN = (_s1, _s2, _s3, _s4, _s5, _s6, _s7, _s8, _s9, _s10)


@lru_cache(maxsize=1)
def tutorial_inhalt() -> dict:
    """Alle zehn Stationen mit Text, Eingaben, Formeln, Tabellen und Rechenweg über den Referenzfall."""
    m = referenzmodell()
    e = bewerte_modell(m)
    stationen = []
    for nr, (station, baustein) in enumerate(zip(STATIONEN, _STATIONEN), start=1):
        teil = baustein(m, e)
        stationen.append({
            "nr": nr,
            "titel": station.titel,
            "abschnitt": station.abschnitt,
            "text": list(station.text),
            "eingaben": _eingaben(m, station.gruppen),
            "formeln": teil["formeln"],
            "tabellen": teil["tabellen"],
            "rechenweg": [s for s in teil["schritte"] if s["schritte"]],
            "kipppunkte": teil.get("kipppunkte", []),
            "satz": teil.get("satz", ""),
            "balken": teil.get("balken"),
        })
    return {"stationen": stationen, "stufen": [{"titel": t, "text": x} for t, x in STUFEN], "rundung": RUNDUNG}
