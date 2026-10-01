"""LaTeX-Darstellung der Rechenweg-Schritte für die API (reine Anzeige, keine Rechnung).

Nutzt kern.ausdruck.als_latex
für Anwenderformeln und api.inhalte.formeln.KERNFORMELN für Kernformeln.
"""
from __future__ import annotations

import re
from dataclasses import asdict

from api import format as fmt
from api.inhalte import formeln
from kern import ausdruck
from kern.modell import Fallmodell, ModellErgebnis, Schritt

_SUMMENBEZUG = re.compile(r'^(kosten|co2)\("(.+)"\)$')


def _tex(x: float) -> str:
    """Zahl für LaTeX: deutsches Format, Komma ohne Abstand, negative Werte in Klammern."""
    t = fmt.rechenwert(x).replace(",", "{,}")
    return r"\left(" + t + r"\right)" if t.startswith("-") else t


def _hilfsgroesse(m: Fallmodell, s: Schritt):
    return next((h for h in m.hilfsgroessen if h.bezeichnung == s.bezeichnung and h.formel == s.formel), None)


def formelteile(m: Fallmodell, s: Schritt) -> tuple[str, str, str, str, str]:
    """Linke Seite, Formel und eingesetzte Werte in LaTeX, dazu Nummer und Abschnitt der Arbeit."""
    d = formeln.KERNFORMELN.get(s.formel)
    if d is None:
        namen = {n: _tex(v) for n, v in s.werte.items() if not _SUMMENBEZUG.match(n)}
        eingesetzt = ausdruck.als_latex(s.formel, namen)
        for n, v in s.werte.items():
            treffer = _SUMMENBEZUG.match(n)
            if treffer:
                zeichen = "K" if treffer[1] == "kosten" else "E"
                eingesetzt = eingesetzt.replace(zeichen + r"_{\text{" + treffer[2] + "}}", _tex(v))
        if s.bereich == "hilfsgroesse":
            h = _hilfsgroesse(m, s)
            links = ausdruck.als_latex(h.name) if h else r"\text{" + s.bezeichnung + "}"
            abschnitt = "Hilfsgröße des Falls"
        else:
            links = formeln.LINKS_POSITION.get(s.einheit, "x")
            abschnitt = formeln.ABSCHNITT_POSITION.get(s.einheit, "")
        return links, ausdruck.als_latex(s.formel), eingesetzt, "", abschnitt
    if d.eingesetzt is not None:
        def ersetzen(t: re.Match) -> str:
            name = t[1]
            if name.endswith("*"):
                name = next(n for n in s.werte if n.startswith(name[:-1]))
            return _tex(s.werte[name])
        eingesetzt = re.sub("«([^»]+)»", ersetzen, d.eingesetzt)
    elif s.formel == "Σ g_j · s_j":
        gewicht = {u.name: u.gewicht for u in m.unterkriterien}
        eingesetzt = " + ".join(f"{_tex(gewicht[n])} \\cdot {_tex(v)}" for n, v in s.werte.items())
    else:
        eingesetzt = " + ".join(_tex(v) for v in s.werte.values()) or "0"
    return d.links, d.latex, eingesetzt, d.nummer, d.abschnitt


def schritt_mit_latex(m: Fallmodell, s: Schritt) -> dict:
    """Schritt als Dict inkl. optionaler LaTeX-Darstellungsfelder für den API-Vertrag."""
    links, formel_latex, eingesetzt, nummer, abschnitt = formelteile(m, s)
    d = asdict(s)
    d["links_latex"] = links
    d["formel_latex"] = formel_latex
    d["eingesetzt_latex"] = eingesetzt
    d["nummer"] = nummer
    d["abschnitt"] = abschnitt
    return d


def ergebnis_mit_latex(m: Fallmodell, e: ModellErgebnis) -> dict:
    """ModellErgebnis als Dict mit angereichertem Rechenweg (Darstellung, keine neuen Zahlen)."""
    d = asdict(e)
    d["rechenweg"] = [schritt_mit_latex(m, s) for s in e.rechenweg]
    return d
