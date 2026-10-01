"""Generisches Fallmodell (Baukasten) für beliebige Bauteile.

Die Methode aus Kapitel 4 bleibt fest: vorgelagertes Gate, drei Dimensionen, technisches
Ausschlusskriterium, Min-Max-Normalisierung (Formel 9), gewichtete Summe (Formel 10), Faktorbausteine
Verzug und Ausschussrisiko (Formeln 11 bis 13). Frei anpassbar sind Felder, Hilfsgrößen, Kosten- und
CO₂-Positionen als Formeln, Alternativen, Unterkriterien, Gewichte, Einflussfaktoren und Szenarien.

`referenzmodell()` bildet den Referenzfall aus Kapitel 4 als Konfiguration dieses Modells ab. Es liefert in S0 bis S11
dieselben Werte wie `bewertung.bewerte`.
"""
from __future__ import annotations

import math
from copy import deepcopy
from dataclasses import asdict, dataclass, field, fields

from . import ausdruck
from .ausdruck import FormelFehler
from .bewertung import Ergebnis, minmax_kosten
from .matching import EIGNUNG, SCHADENSGRAD_SCORE, WERKSTOFFKLASSEN
from .parameter import NAMEN, Fall, referenzparameter
from .technisch import punkte

ARTEN = ("aufbereitung", "neuteil", "ausscheiden", "sonstige")
ARTEN_NAMEN = {"aufbereitung": "Wiederaufbereitung", "neuteil": "Neuteilersatz", "ausscheiden": "Ausscheiden",
               "sonstige": "Sonstige Alternative"}
DIMENSIONEN = {"tech": "technisch", "oekon": "ökonomisch", "oekol": "ökologisch"}
EINHEIT = {"oekon": "€", "oekol": "kg CO₂-Äq"}
FAKTORTYPEN = ("wertaenderung", "zuschlag", "einstellung")
EINSTELLUNGEN = ("bauteil_aufbereitbar", "ersatzbedarf", "neuteil_verfuegbar", "harte_frist",
                 "s_tech_ohne_verfahren")
ABLEITUNGEN = {"schadensgrad": "aus dem Schadensgrad (Tabelle 3)",
               "werkstoffeignung": "aus Schadenstyp und Werkstoffklasse (Tabelle 5)"}
FORMAT = "kpi-remanufacturing-modell"
VERSION = 2


# ---------------------------------------------------------------- Bausteine des Modells

@dataclass
class Feld:
    """Eingangsgröße mit Herkunft (L Literatur, A Annahme, N Nutzerangabe), Quelle und Spanne."""
    name: str
    bezeichnung: str
    wert: float
    einheit: str = ""
    herkunft: str = "N"
    quelle: str = ""
    spanne: tuple[float, float] | None = None
    gruppe: str = ""
    text: str = ""


@dataclass
class Hilfsgroesse:
    """Benannte Zwischenformel, z. B. eine Bearbeitungszeit. Darf in anderen Formeln stehen."""
    name: str
    bezeichnung: str
    formel: str
    einheit: str = ""
    gruppe: str = ""


@dataclass
class Alternative:
    schluessel: str
    name: str
    art: str  # siehe ARTEN
    aktiv: bool = True


@dataclass
class Position:
    """Kosten- (oekon) oder CO₂-Position (oekol) einer oder mehrerer Alternativen."""
    dimension: str
    bezeichnung: str
    formel: str
    alternativen: list[str]
    gruppe: str = ""


@dataclass
class Unterkriterium:
    """Technisches Unterkriterium mit Stufe 1 bis 5 je Alternative (Stufe 1 = Ausschluss).
    Mit `ableitung` wird die Stufe aus den Stammdaten bestimmt statt eingegeben."""
    schluessel: str
    name: str
    gewicht: float
    stufen: dict[str, int] = field(default_factory=dict)
    ableitung: str | None = None


@dataclass
class Gate:
    bauteil_aufbereitbar: bool = True
    ersatzbedarf: bool = True
    neuteil_verfuegbar: bool = True


@dataclass
class Bausteine:
    """Faktorbausteine Verzug (Formel 11) und Ausschussrisiko (Formeln 12, 13). Die Angaben sind
    Formeln, meist nur ein Feldname. Im Referenzfall sind alle Felder so gesetzt, dass die Bausteine
    ohne Wirkung sind."""
    lieferzeit: dict[str, str] = field(default_factory=dict)
    frist: str = "0"
    strafe_tag: str = "0"
    strafe_max: str = ""  # leer bedeutet keine Obergrenze
    stillstand_tag: str = "0"
    ausschuss: str = "0"
    rueckfall: str = "neuteil"
    harte_frist: bool = False


@dataclass
class Einflussfaktor:
    """Externer Einflussfaktor, der Szenarien zugeordnet wird.
    wertaenderung: setzt oder skaliert Felder. zuschlag: fügt Positionen hinzu.
    einstellung: ändert Gate, harte Frist oder die technische Konvention."""
    schluessel: str
    name: str
    typ: str
    beschreibung: str = ""
    setzen: dict[str, float] = field(default_factory=dict)
    skalieren: dict[str, float] = field(default_factory=dict)
    positionen: list[Position] = field(default_factory=list)
    einstellungen: dict[str, float] = field(default_factory=dict)


@dataclass
class Szenario:
    schluessel: str
    name: str
    faktoren: list[str] = field(default_factory=list)
    gewichte: dict[str, float] | None = None
    beschreibung: str = ""


@dataclass
class Stammdaten:
    bauteil: str = ""
    werkstoff: str = ""
    werkstoffklasse: str = WERKSTOFFKLASSEN[0]
    schadenstyp: str = "Verschleiß"
    schadensgrad: str = "mittel"


@dataclass
class Fallmodell:
    name: str
    stammdaten: Stammdaten
    gate: Gate
    alternativen: list[Alternative]
    felder: list[Feld]
    hilfsgroessen: list[Hilfsgroesse]
    positionen: list[Position]
    unterkriterien: list[Unterkriterium]
    gewichte: dict[str, float]
    bausteine: Bausteine
    faktoren: list[Einflussfaktor] = field(default_factory=list)
    szenarien: list[Szenario] = field(default_factory=list)
    s_tech_ohne_verfahren: float = 5.0
    eignung: dict[str, list[int]] = field(default_factory=lambda: {k: list(v) for k, v in EIGNUNG.items()})
    werkstoffklassen: list[str] = field(default_factory=lambda: list(WERKSTOFFKLASSEN))
    schadensgrad_score: dict[str, int] = field(default_factory=lambda: dict(SCHADENSGRAD_SCORE))
    beschreibung: str = ""

    # Zugriffe
    def feld(self, name: str) -> Feld:
        for f in self.felder:
            if f.name == name:
                return f
        raise KeyError(name)

    def alternative(self, schluessel: str) -> Alternative:
        for a in self.alternativen:
            if a.schluessel == schluessel:
                return a
        raise KeyError(schluessel)

    def faktor(self, schluessel: str) -> Einflussfaktor:
        for f in self.faktoren:
            if f.schluessel == schluessel:
                return f
        raise KeyError(schluessel)

    def szenario(self, schluessel: str) -> Szenario:
        for s in self.szenarien:
            if s.schluessel == schluessel:
                return s
        raise KeyError(schluessel)

    def kopie(self) -> "Fallmodell":
        return deepcopy(self)


# ---------------------------------------------------------------- Auswertung

@dataclass
class Schritt:
    """Ein Eintrag im Rechenweg: welche Formel mit welchen Werten zu welchem Ergebnis führte."""
    bereich: str          # hilfsgroesse, position, baustein, summe, technik, normalisierung, beitrag, nutzwert,
    #                       austauschrate
    alternative: str | None
    bezeichnung: str
    formel: str
    werte: dict[str, float]
    ergebnis: float
    einheit: str = ""


@dataclass
class ModellErgebnis(Ergebnis):
    rechenweg: list[Schritt] = field(default_factory=list)
    szenario: str | None = None
    gewichte: dict[str, float] = field(default_factory=dict)
    werte: dict[str, float] = field(default_factory=dict)


class _Rechnung:
    def __init__(self, m: Fallmodell, werte: dict[str, float], zusatz: list[Position]):
        self.m = m
        self.werte = werte
        self.hilf = {h.name: h for h in m.hilfsgroessen}
        self.hilf_wert: dict[str, float] = {}
        self.summen: dict[tuple[str, str], float] = {}
        self.stapel: list[str] = []
        self.zusatz = zusatz
        self.rechenweg: list[Schritt] = []

    def name(self, n: str) -> float:
        if n in self.werte:
            return self.werte[n]
        if n in self.hilf:
            if n not in self.hilf_wert:
                h = self.hilf[n]
                self._betrete(n)
                x = self.formel(h.formel)
                self.stapel.pop()
                self.hilf_wert[n] = x
                self.rechenweg.append(Schritt("hilfsgroesse", None, h.bezeichnung, h.formel,
                                              self.eingesetzt(h.formel), x, h.einheit))
            return self.hilf_wert[n]
        raise FormelFehler(f"Unbekannter Name „{n}“. Weder Feld noch Hilfsgröße.")

    def _betrete(self, n: str) -> None:
        if n in self.stapel:
            raise FormelFehler("Zirkelbezug: " + " → ".join([*self.stapel[self.stapel.index(n):], n]))
        self.stapel.append(n)

    def summe(self, funktion: str, alt: str) -> float:
        dim = "oekon" if funktion == "kosten" else "oekol"
        schluessel = (dim, alt)
        if schluessel not in self.summen:
            if alt not in {a.schluessel for a in self.m.alternativen}:
                raise FormelFehler(f"{funktion}(\"{alt}\"): unbekannte Alternative.")
            self._betrete(f"{funktion}({alt})")
            s = sum(self.formel(p.formel) for p in self.m.positionen
                    if p.dimension == dim and alt in p.alternativen)
            self.stapel.pop()
            self.summen[schluessel] = s
        return self.summen[schluessel]

    def formel(self, f: str) -> float:
        return ausdruck.auswerten(f, self.name, self.summe)

    def eingesetzt(self, f: str) -> dict[str, float]:
        werte = {n: self.name(n) for n in sorted(ausdruck.namen(f))}
        for funktion, alt in sorted(ausdruck.summenbezuege(f)):
            werte[f'{funktion}("{alt}")'] = self.summe(funktion, alt)
        return werte

    def positionen(self, alt: str, dim: str) -> dict[str, float]:
        aus: dict[str, float] = {}
        for p in [*self.m.positionen, *self.zusatz]:
            if p.dimension == dim and alt in p.alternativen:
                x = self.formel(p.formel)
                aus[p.bezeichnung] = aus.get(p.bezeichnung, 0.0) + x
                self.rechenweg.append(Schritt("position", alt, p.bezeichnung, p.formel,
                                              self.eingesetzt(p.formel), x, EINHEIT[dim]))
        return aus


# Toleranz der Summenprüfung: Die Oberfläche zeigt Gewichte mit bis zu sechs Nachkommastellen. Drei
# eingetippte Drittel (3 × 0,333333) sollen gelten, 0,9999 nicht. Ergebnisse gültiger Gewichte bleiben gleich.
GEWICHTE_TOLERANZ = 1e-5


def _gewichte_pruefen(g: dict[str, float], was: str) -> None:
    s = sum(g.values())
    if abs(s - 1) > GEWICHTE_TOLERANZ:
        summe = f"{s:.4f}".replace(".", ",")  # deutsches Zahlenformat, die Meldung erscheint in der Oberfläche
        raise FormelFehler(f"Die Gewichte der {was} summieren sich zu {summe} statt zu 1.")
    if min(g.values(), default=0) < 0:
        raise FormelFehler(f"Die Gewichte der {was} dürfen nicht negativ sein.")


def mit_dimensionsgewicht(g: dict[str, float], dimension: str, w: float) -> dict[str, float]:
    """Setzt ein Dimensionsgewicht und verteilt den Rest im bisherigen Verhältnis (wie Gewichte)."""
    rest = sum(v for k, v in g.items() if k != dimension)
    neu = {k: (1 - w) * v / rest for k, v in g.items() if k != dimension}
    neu[dimension] = w
    return {k: neu[k] for k in g}


def bewerte_modell(m: Fallmodell, szenario: str | Szenario | None = None,
                   ueberschreibungen: dict[str, float] | None = None,
                   gewichte: dict[str, float] | None = None) -> ModellErgebnis:
    """Bewertet ein Fallmodell, optional in einem Szenario und mit einzelnen Feldwerten überschrieben
    (für die Sensitivitätsanalyse). Formeln (5), (6), (8) bis (13) wie in Kapitel 4."""
    sz = m.szenario(szenario) if isinstance(szenario, str) else szenario

    # 1. Feldwerte, Einflussfaktoren des Szenarios, Überschreibungen
    werte = {f.name: float(f.wert) for f in m.felder}
    einst: dict[str, float] = {"s_tech_ohne_verfahren": m.s_tech_ohne_verfahren,
                               "harte_frist": m.bausteine.harte_frist, **asdict(m.gate)}
    zusatz: list[Position] = []
    for fs in (sz.faktoren if sz else []):
        f = m.faktor(fs)
        for k, x in f.setzen.items():
            if k not in werte:
                raise FormelFehler(f"Einflussfaktor „{f.name}“ setzt das unbekannte Feld „{k}“.")
            werte[k] = float(x)
        for k, x in f.skalieren.items():
            if k not in werte:
                raise FormelFehler(f"Einflussfaktor „{f.name}“ skaliert das unbekannte Feld „{k}“.")
            werte[k] *= float(x)
        zusatz.extend(f.positionen)
        einst.update(f.einstellungen)
    for k, x in (ueberschreibungen or {}).items():
        if k not in werte:
            raise FormelFehler(f"Unbekanntes Feld „{k}“.")
        werte[k] = float(x)

    g = dict(gewichte or (sz.gewichte if sz and sz.gewichte else None) or m.gewichte)
    _gewichte_pruefen(g, "Dimensionen")
    _gewichte_pruefen({u.schluessel: u.gewicht for u in m.unterkriterien}, "Unterkriterien")
    r = _Rechnung(m, werte, zusatz)
    art = {a.schluessel: a.art for a in m.alternativen}

    # 2. Gate und Zulässigkeit (Abschnitte 4.1.4 und 4.2.4)
    raus: dict[str, str] = {}
    for a in m.alternativen:
        if not a.aktiv:
            raus[a.schluessel] = "vom Anwender deaktiviert"
    if not einst["bauteil_aufbereitbar"]:
        for a in m.alternativen:
            if a.art == "aufbereitung":
                raus[a.schluessel] = "Bauteil in der vorgelagerten Eignungsprüfung nicht wiederaufbereitbar"
    for a in m.alternativen:
        if einst["ersatzbedarf"] and a.art == "ausscheiden":
            raus[a.schluessel] = "Ersatzbedarf besteht, Ausscheiden stellt kein einsatzfähiges Bauteil bereit"
        if not einst["ersatzbedarf"] and a.art == "neuteil":
            raus[a.schluessel] = "kein Ersatzbedarf, Beschaffung eines Neuteils gegenstandslos"
    if not einst["neuteil_verfuegbar"]:
        for a in m.alternativen:
            if a.art == "neuteil" and a.schluessel not in raus:
                raus[a.schluessel] = "Neuteil nicht verfügbar"
    kandidaten = [a.schluessel for a in m.alternativen if a.schluessel not in raus]

    # 3. Technische Unterkriterien und Ausschlusskriterium der zweiten Ebene
    def stufe(u: Unterkriterium, alt: str) -> int:
        sd = m.stammdaten
        if u.ableitung == "schadensgrad":
            return m.schadensgrad_score[sd.schadensgrad]
        if u.ableitung == "werkstoffeignung":
            return m.eignung[sd.schadenstyp][m.werkstoffklassen.index(sd.werkstoffklasse)]
        if alt not in u.stufen:
            raise FormelFehler(f"Für „{u.name}“ fehlt die Stufe der Alternative „{alt}“.")
        return int(u.stufen[alt])

    unter = {a: ({u.schluessel: stufe(u, a) for u in m.unterkriterien}
                 if art[a] in ("aufbereitung", "sonstige") else None) for a in kandidaten}
    for a in kandidaten:
        if unter[a] is not None and unter[a] and min(unter[a].values()) <= 1:
            raus[a] = "technisches Ausschlusskriterium, ein Unterkriterium auf Stufe 1"

    # 4. Harte Frist mit Lockerung nach Pinedo (2016, S. 453)
    b = m.bausteine

    def lieferzeit(a: str) -> float:
        return r.formel(b.lieferzeit.get(a, "0") or "0")

    hinweise: list[str] = []
    frist = r.formel(b.frist or "0")
    if einst["harte_frist"]:
        offen = [a for a in kandidaten if a not in raus]
        verspaetet = [a for a in offen if lieferzeit(a) > frist]
        if len(verspaetet) == len(offen):
            hinweise.append("Keine Alternative hält die harte Frist. Sie wird als weiche Frist behandelt.")
        else:
            for a in verspaetet:
                raus[a] = "harte Frist, Lieferzeit überschreitet die Frist"
    alts = [a for a in kandidaten if a not in raus]

    # 5. Positionen der ökonomischen und ökologischen Dimension (Formel 8)
    kosten_pos = {a: r.positionen(a, "oekon") for a in alts}
    co2_pos = {a: r.positionen(a, "oekol") for a in alts}

    # 6. Faktorbausteine Verzug (Formel 11) und Ausschussrisiko (Formeln 12, 13)
    strafe_tag, stillstand = r.formel(b.strafe_tag or "0"), r.formel(b.stillstand_tag or "0")
    strafe_max = r.formel(b.strafe_max) if (b.strafe_max or "").strip() else math.inf

    def verzug(t_a: float) -> float:
        tage = max(0.0, t_a - frist)
        return min(tage * strafe_tag, strafe_max) + tage * stillstand

    rueck = b.rueckfall if b.rueckfall in art else None
    p_aus = r.formel(b.ausschuss or "0")
    t_neu = lieferzeit(rueck) if rueck else 0.0
    for a in alts:
        t_a = lieferzeit(a)
        p = p_aus if (art[a] == "aufbereitung" and rueck) else 0.0
        k_v = (1 - p) * verzug(t_a) + p * verzug(t_a + t_neu)
        if k_v:
            kosten_pos[a]["Verzug"] = k_v
            r.rechenweg.append(Schritt("baustein", a, "Verzug", "(1 − p)·K_V(t_a) + p·K_V(t_a + t_R)",
                                       {"p": p, "t_a": t_a, "t_R": t_neu, "Frist": frist,
                                        "Strafe je Arbeitstag": strafe_tag, "Stillstand je Arbeitstag": stillstand},
                                       k_v, "€"))
        if p:
            k_r, e_r = r.summe("kosten", rueck), r.summe("co2", rueck)
            kosten_pos[a]["Ausschussrisiko"] = p * k_r
            co2_pos[a]["Ausschussrisiko"] = p * e_r
            r.rechenweg.append(Schritt("baustein", a, "Ausschussrisiko, Kosten", "p · K_R",
                                       {"p": p, "K_R": k_r}, p * k_r, "€"))
            r.rechenweg.append(Schritt("baustein", a, "Ausschussrisiko, Treibhauspotenzial", "p · E_R",
                                       {"p": p, "E_R": e_r}, p * e_r, "kg CO₂-Äq"))

    # 7. Summen, technische Dimension (Formeln 5, 6), Normalisierung (Formel 9), Nutzwert (Formel 10)
    kosten = {a: sum(kosten_pos[a].values()) for a in alts}
    co2 = {a: sum(co2_pos[a].values()) for a in alts}
    for a in alts:  # Summen je Alternative (Formel 8 und ökonomisches Gegenstück), Rechenweg der Rohwerte
        r.rechenweg.append(Schritt("summe", a, "Kosten gesamt", "Σ K_p", dict(kosten_pos[a]), kosten[a], "€"))
        r.rechenweg.append(Schritt("summe", a, "Treibhauspotenzial gesamt", "Σ E_p", dict(co2_pos[a]), co2[a],
                                   "kg CO₂-Äq"))
    s_tech: dict[str, float] = {}
    for a in alts:
        if unter[a] is None:
            s_tech[a] = float(einst["s_tech_ohne_verfahren"])
            r.rechenweg.append(Schritt("technik", a, "Dimensionswert technisch", "s = s_ohne_Verfahren (Konvention 4.3.1)",
                                       {"s_ohne_Verfahren": s_tech[a]}, s_tech[a]))
        else:
            s_tech[a] = sum(u.gewicht * unter[a][u.schluessel] for u in m.unterkriterien)
            r.rechenweg.append(Schritt("technik", a, "Dimensionswert technisch", "Σ g_j · s_j",
                                       {u.name: unter[a][u.schluessel] for u in m.unterkriterien},
                                       s_tech[a]))
    n_tech = {a: punkte(s_tech[a]) for a in alts}
    for a in alts:
        r.rechenweg.append(Schritt("technik", a, "Punkte technisch", "(s − 1) / 4 · 100", {"s": s_tech[a]},
                                   n_tech[a]))
    n_oekon = minmax_kosten(kosten) if alts else {}
    n_oekol = minmax_kosten(co2) if alts else {}
    for dim, roh, n in (("oekon", kosten, n_oekon), ("oekol", co2, n_oekol)):
        if not alts:
            break
        lo, hi = min(roh.values()), max(roh.values())
        for a in alts:
            r.rechenweg.append(Schritt("normalisierung", a, f"Punkte {DIMENSIONEN[dim]}",
                                       "(x_max − x) / (x_max − x_min) · 100",
                                       {"x": roh[a], "x_min": lo, "x_max": hi}, n[a]))
    beitrag = {a: {"tech": g["tech"] * n_tech[a], "oekon": g["oekon"] * n_oekon[a],
                   "oekol": g["oekol"] * n_oekol[a]} for a in alts}
    nutzwert = {a: sum(beitrag[a].values()) for a in alts}
    punkte_dim = {"tech": n_tech, "oekon": n_oekon, "oekol": n_oekol}
    for a in alts:
        for dim, n in punkte_dim.items():
            r.rechenweg.append(Schritt("beitrag", a, f"Beitrag {DIMENSIONEN[dim]}", "w_d · n_d",
                                       {f"w_{dim}": g[dim], f"n_{dim}": n[a]}, beitrag[a][dim]))
        r.rechenweg.append(Schritt("nutzwert", a, "Gesamtnutzwert", "Σ w_d · n_d",
                                   {"w_tech": g["tech"], "n_tech": n_tech[a], "w_oekon": g["oekon"],
                                    "n_oekon": n_oekon[a], "w_oekol": g["oekol"], "n_oekol": n_oekol[a]},
                                   nutzwert[a]))
    rang = sorted(alts, key=lambda a: nutzwert[a], reverse=True)
    e = ModellErgebnis(alts, raus, {a: unter[a] for a in alts}, s_tech, kosten_pos, co2_pos, kosten, co2,
                       n_tech, n_oekon, n_oekol, beitrag, nutzwert, rang, hinweise,
                       rechenweg=r.rechenweg, szenario=sz.schluessel if sz else None, gewichte=g,
                       werte=werte)

    # 8. Implizite Austauschrate (Abschnitt 4.4.2), Rechenweg der Zahl auf der Ergebnis-Seite (E15)
    rate = austauschrate(e)
    if rate is not None:
        e.rechenweg.append(Schritt("austauschrate", None, "Implizite Austauschrate",
                                   "w_oekol / w_oekon · (K_max − K_min) / (E_max − E_min) · 1000",
                                   {"w_oekol": g["oekol"], "w_oekon": g["oekon"],
                                    "K_max": max(kosten.values()), "K_min": min(kosten.values()),
                                    "E_max": max(co2.values()), "E_min": min(co2.values())},
                                   rate, "€ je t CO₂-Äq"))
    return e


def bausteine_werte(m: Fallmodell, szenario: str | Szenario | None = None) -> dict[str, float]:
    """Werte der Faktorbausteine im Szenario (Formel 11 bis 13): frist, strafe_tag, strafe_max (unendlich, wenn
    leer), stillstand_tag, ausschuss und lieferzeit:<Alternative>. Die Formeln werden mit den Feldwerten nach den
    Einflussfaktoren des Szenarios ausgewertet, wie in bewerte_modell."""
    e = bewerte_modell(m, szenario)
    r = _Rechnung(m, e.werte, [])
    b = m.bausteine
    aus = {"frist": r.formel(b.frist or "0"), "strafe_tag": r.formel(b.strafe_tag or "0"),
           "strafe_max": r.formel(b.strafe_max) if (b.strafe_max or "").strip() else math.inf,
           "stillstand_tag": r.formel(b.stillstand_tag or "0"), "ausschuss": r.formel(b.ausschuss or "0")}
    for a in m.alternativen:
        aus[f"lieferzeit:{a.schluessel}"] = r.formel(b.lieferzeit.get(a.schluessel, "0") or "0")
    return aus


@dataclass
class Szenariovergleich:
    """Ein Szenario im Vergleich mit dem Basisfall (Abschnitt 4.5.4, Tabelle 20). Die Differenz des
    Gesamtnutzwerts entsteht aus ungerundeten Werten und fehlt für Alternativen, die im Szenario oder im
    Basisfall ausgeschlossen sind. Ist das Szenario nicht auswertbar, steht der Grund in `fehler`."""
    szenario: Szenario | None          # None = Basisfall
    ergebnis: ModellErgebnis | None
    differenz: dict[str, float] = field(default_factory=dict)
    anderer_sieger: bool = False       # Rang 1 weicht vom Basisfall ab
    fehler: str = ""


def vergleich_szenarien(m: Fallmodell) -> list[Szenariovergleich]:
    """Basisfall und alle Szenarien des Modells mit der Differenz zum Basisfall je Alternative.
    Der erste Eintrag ist der Basisfall (ohne Einflussfaktoren, Differenz null)."""
    basis = bewerte_modell(m)
    sieger = basis.rangfolge[0] if basis.rangfolge else None
    aus = [Szenariovergleich(None, basis, {a: 0.0 for a in basis.alternativen})]
    for sz in m.szenarien:
        try:
            e = bewerte_modell(m, sz)
        except FormelFehler as f:
            aus.append(Szenariovergleich(sz, None, fehler=str(f)))
            continue
        diff = {a: e.nutzwert[a] - basis.nutzwert[a] for a in e.alternativen if a in basis.nutzwert}
        erster = e.rangfolge[0] if e.rangfolge else None
        aus.append(Szenariovergleich(sz, e, diff, erster != sieger))
    return aus


def austauschrate(e: ModellErgebnis) -> float | None:
    """Implizite Bewertung einer Tonne CO₂-Äq in Euro (Abschnitt 4.4.2): Kostenspanne je
    CO₂-Spanne, gewichtet mit dem Verhältnis der Dimensionsgewichte. None, wenn nicht bestimmbar."""
    if len(e.alternativen) < 2 or not e.gewichte.get("oekon"):
        return None
    r_eur = max(e.kosten.values()) - min(e.kosten.values())
    r_kg = max(e.co2.values()) - min(e.co2.values())
    if r_kg <= 0:
        return None
    return e.gewichte["oekol"] / e.gewichte["oekon"] * r_eur / r_kg * 1000


@dataclass
class WasserfallStufe:
    """Ein Balken im Wasserfall der Positionen (Kapitel 5, Positionen je Alternative): die Position mit ihrem
    Wert und dem Zwischenstand vor und nach ihr. Die letzte Stufe ist die Summe (von 0 bis Summe)."""
    position: str
    wert: float
    von: float
    bis: float
    summe: bool = False


def wasserfall(e: ModellErgebnis, alternative: str, dimension: str) -> list[WasserfallStufe]:
    """Positionen einer Alternative in der Reihenfolge des Ergebnisses als Zwischenstände (Formel 8).
    Die Summe ist `e.kosten` oder `e.co2`, also dieselbe Zahl wie in Rohwerten und Rechenweg."""
    pos = (e.kosten_pos if dimension == "oekon" else e.co2_pos)[alternative]
    summe = (e.kosten if dimension == "oekon" else e.co2)[alternative]
    aus: list[WasserfallStufe] = []
    werte = list(pos.values())
    stand = 0.0
    for i, (name, x) in enumerate(pos.items()):
        # Zwischenstand mit sum() wie die Summe im Ergebnis: ab Python 3.12 summiert sum() kompensiert, eine
        # schrittweise Addition wiche in der letzten Stelle ab. So ist der letzte Stand exakt die Summe.
        bis = sum(werte[: i + 1])
        aus.append(WasserfallStufe(name, x, stand, bis))
        stand = bis
    aus.append(WasserfallStufe("Summe", summe, 0.0, summe, summe=True))
    return aus


def gewichte_fuer_kostensatz(e: ModellErgebnis, eur_je_t: float) -> dict[str, float]:
    """Dimensionsgewichte, deren implizite Austauschrate einem CO₂-Kostensatz entspricht. Das technische
    Gewicht bleibt, der Rest wird auf Ökonomie und Ökologie verteilt (Szenarien S7a, S7b)."""
    rate_gleich = austauschrate(e) / (e.gewichte["oekol"] / e.gewichte["oekon"])
    q = eur_je_t / rate_gleich
    rest = 1 - e.gewichte["tech"]
    return {"tech": e.gewichte["tech"], "oekon": rest / (1 + q), "oekol": rest * q / (1 + q)}


# ---------------------------------------------------------------- Prüfung

@dataclass
class Meldung:
    stufe: str   # "fehler" oder "warnung"
    ort: str
    text: str


def pruefe_modell(m: Fallmodell) -> list[Meldung]:
    """Prüft ein Modell vollständig und liefert verständliche Meldungen, ohne abzubrechen."""
    aus: list[Meldung] = []
    feldnamen = [f.name for f in m.felder]
    hilfnamen = [h.name for h in m.hilfsgroessen]
    alle = set(feldnamen) | set(hilfnamen)
    alt_schl = [a.schluessel for a in m.alternativen]

    # Faktoren und Szenarien werden über den Schlüssel gefunden, ein doppelter würde still den ersten treffen
    for liste, was in ((feldnamen, "Feld"), (hilfnamen, "Hilfsgröße"), (alt_schl, "Alternative"),
                       ([f.schluessel for f in m.faktoren], "Einflussfaktor"),
                       ([s.schluessel for s in m.szenarien], "Szenario")):
        doppelt = {n for n in liste if liste.count(n) > 1}
        for n in sorted(doppelt):
            aus.append(Meldung("fehler", was, f"Der Name „{n}“ ist mehrfach vergeben."))
    for n in sorted(set(feldnamen) & set(hilfnamen)):
        aus.append(Meldung("fehler", "Hilfsgröße", f"„{n}“ ist zugleich Feld und Hilfsgröße."))
    for n in [*feldnamen, *hilfnamen]:
        if not n.isidentifier() or n in ausdruck.ERLAUBTE_FUNKTIONEN:
            aus.append(Meldung("fehler", "Name", f"„{n}“ ist als Name nicht zulässig. Erlaubt sind Buchstaben, "
                                                  "Ziffern und Unterstrich, am Anfang keine Ziffer."))

    def formel(f: str, ort: str) -> None:
        try:
            for n in ausdruck.namen(f) - alle:
                aus.append(Meldung("fehler", ort, f"Unbekannter Name „{n}“ in „{f}“."))
            for _, a in ausdruck.summenbezuege(f):
                if a not in alt_schl:
                    aus.append(Meldung("fehler", ort, f"Unbekannte Alternative „{a}“ in „{f}“."))
        except FormelFehler as e:
            aus.append(Meldung("fehler", ort, str(e)))

    for h in m.hilfsgroessen:
        formel(h.formel, f"Hilfsgröße {h.bezeichnung}")
    for p in m.positionen:
        formel(p.formel, f"Position {p.bezeichnung}")
        for a in p.alternativen:
            if a not in alt_schl:
                aus.append(Meldung("fehler", f"Position {p.bezeichnung}", f"Unbekannte Alternative „{a}“."))
    b = m.bausteine
    for ort, f in [("Frist", b.frist), ("Strafe je Arbeitstag", b.strafe_tag), ("Obergrenze", b.strafe_max),
                   ("Stillstand", b.stillstand_tag), ("Ausschussrisiko", b.ausschuss),
                   *((f"Lieferzeit {a}", x) for a, x in b.lieferzeit.items())]:
        if (f or "").strip():
            formel(f, f"Baustein {ort}")
    for f in m.faktoren:
        if f.typ not in FAKTORTYPEN:
            aus.append(Meldung("fehler", f"Einflussfaktor {f.name}", f"Unbekannter Typ „{f.typ}“."))
        for k in [*f.setzen, *f.skalieren]:
            if k not in feldnamen:
                aus.append(Meldung("fehler", f"Einflussfaktor {f.name}", f"Unbekanntes Feld „{k}“."))
        for p in f.positionen:
            formel(p.formel, f"Einflussfaktor {f.name}")
        for k in f.einstellungen:
            if k not in EINSTELLUNGEN:
                aus.append(Meldung("fehler", f"Einflussfaktor {f.name}", f"Unbekannte Einstellung „{k}“."))
    faktor_schl = {f.schluessel for f in m.faktoren}
    for s in m.szenarien:
        for k in s.faktoren:
            if k not in faktor_schl:
                aus.append(Meldung("fehler", f"Szenario {s.name}", f"Unbekannter Einflussfaktor „{k}“."))

    for g, was in ((m.gewichte, "Dimensionen"), ({u.schluessel: u.gewicht for u in m.unterkriterien},
                                                 "Unterkriterien")):
        try:
            _gewichte_pruefen(g, was)
        except FormelFehler as e:
            aus.append(Meldung("fehler", "Gewichte", str(e)))
    for u in m.unterkriterien:
        if u.ableitung and u.ableitung not in ABLEITUNGEN:
            aus.append(Meldung("fehler", f"Unterkriterium {u.name}", f"Unbekannte Ableitung „{u.ableitung}“."))
        for a, s in u.stufen.items():
            if not 1 <= int(s) <= 5:
                aus.append(Meldung("fehler", f"Unterkriterium {u.name}", f"Stufe {s} für „{a}“ liegt nicht "
                                                                         "zwischen 1 und 5."))
    for a in m.alternativen:
        if a.art not in ARTEN:
            aus.append(Meldung("fehler", f"Alternative {a.name}", f"Unbekannte Art „{a.art}“."))
        elif a.aktiv and not any(a.schluessel in p.alternativen for p in m.positionen):
            aus.append(Meldung("warnung", f"Alternative {a.name}", "Keine Kosten- oder CO₂-Position zugeordnet."))
    for f in m.felder:
        if f.spanne and not (min(f.spanne) <= f.wert <= max(f.spanne)):
            aus.append(Meldung("warnung", f"Feld {f.bezeichnung}", "Wert liegt außerhalb der Spanne."))
        if f.herkunft not in ("L", "A", "N"):
            aus.append(Meldung("fehler", f"Feld {f.bezeichnung}", "Herkunft muss L, A oder N sein."))

    if not any(x.stufe == "fehler" for x in aus):
        # Zirkelbezüge und Rechenfehler zeigen sich erst bei der Auswertung
        for s in [None, *m.szenarien]:
            try:
                bewerte_modell(m, s)
            except FormelFehler as e:
                aus.append(Meldung("fehler", f"Szenario {s.name}" if s else "Basisfall", str(e)))
                break
    return aus


def alternativen_setzen(
    m: Fallmodell,
    neue: list[Alternative],
    zuordnung: dict[str, str | None],
) -> Fallmodell:
    """Alternativenliste ersetzen. ``zuordnung``: alter Schlüssel → neuer Schlüssel (None = gelöscht).

    Positionen, Stufen, Lieferzeit und Rückfall werden nachgezogen. Neue Alternativen der Art
    Wiederaufbereitung oder sonstige erhalten in jedem Unterkriterium ohne Ableitung die Stufe 3.
    Keine Rechnung – reine Strukturpflege für die Oberfläche.
    """
    for i, a in enumerate(neue, start=1):
        if not a.schluessel.isidentifier():
            raise ValueError(
                f"Zeile {i}: Der Schlüssel „{a.schluessel}“ darf nur Buchstaben, Ziffern und "
                "Unterstrich enthalten und nicht mit einer Ziffer beginnen."
            )
        if a.art not in ARTEN:
            raise ValueError(f"Zeile {i}: Art „{a.art}“ ist unbekannt.")
    schluessel = [a.schluessel for a in neue]
    namen = [a.name for a in neue]
    for liste, was in ((schluessel, "Der Schlüssel"), (namen, "Der Name")):
        doppelt = sorted({w for w in liste if w and liste.count(w) > 1})
        if doppelt:
            raise ValueError(
                f"{was} „{doppelt[0]}“ ist mehrfach vergeben. Jede Zeile braucht einen eigenen Eintrag."
            )
        if any(not (w or "").strip() for w in liste):
            raise ValueError(f"{was} fehlt.")

    behalten = set(schluessel)

    def neu_name(s: str) -> str | None:
        s2 = zuordnung[s] if s in zuordnung else s
        if s2 is None:
            return None
        return s2 if s2 in behalten else None

    m = m.kopie()
    for p in m.positionen:
        p.alternativen = [x for x in (neu_name(s) for s in p.alternativen) if x]
    for u in m.unterkriterien:
        u.stufen = {n: v for s, v in u.stufen.items() if (n := neu_name(s))}
    m.bausteine.lieferzeit = {
        n: v for s, v in m.bausteine.lieferzeit.items() if (n := neu_name(s))
    }
    m.bausteine.rueckfall = neu_name(m.bausteine.rueckfall) or ""
    m.alternativen = list(neue)
    for a in neue:
        if a.art in ("aufbereitung", "sonstige"):
            for u in m.unterkriterien:
                if not u.ableitung:
                    u.stufen.setdefault(a.schluessel, 3)
    return m


# ---------------------------------------------------------------- Speichern und Laden (JSON)

def _zahl_json(x: float) -> float | None:
    return None if isinstance(x, float) and math.isinf(x) else x


def modell_zu_dict(m: Fallmodell) -> dict:
    d = asdict(m)
    for f in d["felder"]:
        f["wert"] = _zahl_json(f["wert"])
        f["spanne"] = list(f["spanne"]) if f["spanne"] else None
    return {"format": FORMAT, "version": VERSION, "modell": d}


def _baue(cls, d: dict):
    namen = {f.name for f in fields(cls)}
    return cls(**{k: v for k, v in d.items() if k in namen})


def modell_aus_dict(d: dict) -> Fallmodell:
    """Lädt ein Modell im Format Version 2 oder einen Fall im Format Version 1."""
    if d.get("format") == "kpi-remanufacturing-fall":
        return _aus_v1(d)
    if d.get("format") != FORMAT:
        raise FormelFehler("Die Datei ist kein Fallmodell dieses Werkzeugs.")
    if d.get("version") != VERSION:
        raise FormelFehler(f"Version {d.get('version')} wird nicht unterstützt.")
    x = deepcopy(d["modell"])
    felder = []
    for f in x["felder"]:
        f["wert"] = math.inf if f["wert"] is None else float(f["wert"])
        f["spanne"] = tuple(f["spanne"]) if f["spanne"] else None
        felder.append(_baue(Feld, f))
    faktoren = []
    for f in x.get("faktoren", []):
        f["positionen"] = [_baue(Position, p) for p in f.get("positionen", [])]
        faktoren.append(_baue(Einflussfaktor, f))
    x.update(
        stammdaten=_baue(Stammdaten, x["stammdaten"]),
        gate=_baue(Gate, x["gate"]),
        alternativen=[_baue(Alternative, a) for a in x["alternativen"]],
        felder=felder,
        hilfsgroessen=[_baue(Hilfsgroesse, h) for h in x["hilfsgroessen"]],
        positionen=[_baue(Position, p) for p in x["positionen"]],
        unterkriterien=[_baue(Unterkriterium, u) for u in x["unterkriterien"]],
        bausteine=_baue(Bausteine, x["bausteine"]),
        faktoren=faktoren,
        szenarien=[_baue(Szenario, s) for s in x.get("szenarien", [])],
    )
    return _baue(Fallmodell, x)


def _aus_v1(d: dict) -> Fallmodell:
    """Fall im Format Version 1 (daten/referenzfall.json) auf das Referenzmodell übertragen."""
    m = referenzmodell()
    fall, g, p = d["fall"], d["gewichte"], d["parameter"]
    for f in m.felder:
        k = PARAMETERNAME.get(f.name, f.name)
        if k in p:
            f.wert = math.inf if p[k]["wert"] is None else float(p[k]["wert"])
    zusatz = (p.get("zusatz_co2_aufbereitung") or {}).get("wert") or 0.0
    if zusatz:
        m.positionen.append(Position("oekol", "Zusatzpositionen (Variante 4.3.3)", repr(float(zusatz)),
                                     ["intern", "extern"]))
    m.stammdaten = Stammdaten(fall["bauteil"], fall["werkstoff"], fall["werkstoffklasse"], fall["schadenstyp"],
                              fall["schadensgrad"])
    m.gate = Gate(fall["bauteil_aufbereitbar"], fall["ersatzbedarf"], fall["neuteil_verfuegbar"])
    if fall.get("eignungstabelle"):
        m.eignung = {k: list(v) for k, v in fall["eignungstabelle"].items()}
    m.bausteine.harte_frist = fall["harte_frist"]
    m.s_tech_ohne_verfahren = fall["s_tech_ohne_verfahren"]
    for u in m.unterkriterien:
        u.gewicht = g[u.schluessel]
        if u.schluessel == "technologie":
            u.stufen = {"intern": fall["tv_intern"], "extern": fall["tv_extern"]}
        if u.schluessel == "prozess":
            u.stufen = {"intern": fall["pf_intern"], "extern": fall["pf_extern"]}
    m.gewichte = {"tech": g["tech"], "oekon": g["oekon"], "oekol": g["oekol"]}
    return m


# ---------------------------------------------------------------- Referenzmodell und Vorlage

# Feldnamen im Fallmodell, die vom Parameternamen der Referenzimplementierung abweichen. Die Referenz-
# implementierung (kern/parameter.py, Kapitel 4) und Fall-Dateien Version 1 behalten den Parameternamen.
# "auftragsmasse" wie in den Tabellen 11 und 13, damit die Formeln ohne Nachschlagen lesbar sind (E25).
FELDNAME = {"auftrag": "auftragsmasse"}
PARAMETERNAME = {f: k for k, f in FELDNAME.items()}

# Bezeichnung und Gruppe der Felder wie in den Tabellen 6, 11 und 13
_FELDER = {
    "masse": ("Masse des Bauteils", "Bauteil und Auftrag"),
    "auftrag": ("Auftragsmasse des Zusatzwerkstoffs je Bauteil", "Bauteil und Auftrag"),
    "losgroesse": ("Losgröße", "Bauteil und Auftrag"),
    "lohn": ("Lohnsatz", "Kostensätze"),
    "strompreis": ("Strompreis", "Kostensätze"),
    "msr_auftrag": ("Maschinenstundensatz Materialauftrag", "Kostensätze"),
    "msr_zerspanung": ("Maschinenstundensatz Zerspanung", "Kostensätze"),
    "gk_satz": ("Gemeinkostensatz", "Kostensätze"),
    "drahtpreis": ("Preis Zusatzwerkstoff", "Preise"),
    "gaspreis": ("Preis Schutzgas", "Preise"),
    "schrotterloes": ("Schrotterlös", "Preise"),
    "neuteilpreis_kg": ("Neuteilpreis", "Preise"),
    "aufschlag": ("Aufschlag des Dienstleisters", "Preise"),
    "abscheiderate": ("Abscheiderate", "Prozessdaten"),
    "mrr_schruppen": ("Zeitspanungsrate Schruppen", "Prozessdaten"),
    "mrr_schlichten": ("Zeitspanungsrate Schlichten", "Prozessdaten"),
    "anteil_endbearbeitung": ("Anteil der Endbearbeitung am Auftrag", "Prozessdaten"),
    "t_reinigung": ("Dauer Reinigung", "Prozessdaten"),
    "t_pruefung": ("Dauer Prüfung", "Prozessdaten"),
    "t_fremdvergabe": ("Dauer Beauftragung und Abnahme", "Prozessdaten"),
    "gasmenge": ("Schutzgasmenge", "Prozessdaten"),
    "flaeche_reinigung": ("Gereinigte Oberfläche", "Prozessdaten"),
    "fracht_sendung": ("Frachtpreis je Sendung", "Transport"),
    "fracht_palette": ("Frachtpreis je Palette", "Transport"),
    "fracht_km": ("Frachtpreis je Palette und Kilometer", "Transport"),
    "frachtindex": ("Preisindex Fracht 2006 bis 2023", "Transport"),
    "entfernung": ("Transportentfernung je Richtung", "Transport"),
    "teile_je_palette": ("Teile je Palette", "Transport"),
    "e_draht": ("Emissionsfaktor Zusatzwerkstoff", "Emissionsfaktoren"),
    "w_auftrag": ("Strombedarf Materialauftrag", "Emissionsfaktoren"),
    "dichte_argon": ("Dichte Argon", "Emissionsfaktoren"),
    "e_argon": ("Emissionsfaktor Argon", "Emissionsfaktoren"),
    "e_schruppen": ("Emissionsfaktor Schruppen", "Emissionsfaktoren"),
    "e_schlichten": ("Emissionsfaktor Schlichten", "Emissionsfaktoren"),
    "w_reinigung": ("Strombedarf Reinigung", "Emissionsfaktoren"),
    "f_strom": ("Emissionsfaktor Strom", "Emissionsfaktoren"),
    "e_stahl": ("Emissionsfaktor Stahl", "Emissionsfaktoren"),
    "e_warm": ("Emissionsfaktor Warmumformung", "Emissionsfaktoren"),
    "e_schrott": ("Emissionsfaktor Schrottentsorgung", "Emissionsfaktoren"),
    "e_lkw": ("Emissionsfaktor Lkw", "Emissionsfaktoren"),
    "ausnutzung": ("Ausnutzungsfaktor Neuteil", "Emissionsfaktoren"),
    "gutschrift_schrott": ("Gutschrift Schrott (vermiedene Last)", "Emissionsfaktoren"),
    "lieferzeit_intern": ("Lieferzeit interne Wiederaufbereitung", "Einflussfaktoren"),
    "lieferzeit_extern": ("Lieferzeit externe Wiederaufbereitung", "Einflussfaktoren"),
    "lieferzeit_neuteil": ("Lieferzeit Neuteil", "Einflussfaktoren"),
    "frist": ("Frist", "Einflussfaktoren"),
    "strafe_tag": ("Vertragsstrafe je Arbeitstag", "Einflussfaktoren"),
    "strafe_max": ("Obergrenze der Vertragsstrafe", "Einflussfaktoren"),
    "stillstand_tag": ("Stillstandskosten je Arbeitstag", "Einflussfaktoren"),
    "ausschuss": ("Ausschussrisiko der Wiederaufbereitung", "Einflussfaktoren"),
}

_HILFSGROESSEN = [
    ("t_vorbereitung", "Zeit spanende Vorbereitung", "auftragsmasse / mrr_schruppen", "h"),
    ("t_auftrag", "Zeit Materialauftrag", "auftragsmasse / abscheiderate", "h"),
    ("t_endbearbeitung", "Zeit spanende Endbearbeitung", "auftragsmasse * anteil_endbearbeitung / mrr_schlichten", "h"),
    ("t_maschine", "Maschinenzeit", "t_vorbereitung + t_endbearbeitung + t_auftrag", "h"),
    ("gas_m3", "Schutzgasverbrauch", "gasmenge * t_auftrag * 60 / 1000", "m³"),
    ("argon_kg", "Schutzgasmasse", "gas_m3 * dichte_argon", "kg"),
    ("strom_kwh", "Strombedarf Wiederaufbereitung", "auftragsmasse * w_auftrag + flaeche_reinigung * w_reinigung", "kWh"),
    ("fracht_je_teil", "Stückgutfracht je Teil und Richtung (Gudehus 2010)",
     "(fracht_sendung + aufrunden(losgroesse / teile_je_palette) * (fracht_palette + entfernung * fracht_km))"
     " * frachtindex / losgroesse", "€"),
    ("rohteil", "Masse des Rohteils", "masse * ausnutzung", "kg"),
]

_AUF = ["intern", "extern"]
_POSITIONEN = [
    # Ökonomische Dimension, Tabelle 10
    ("oekon", "Reinigung", "t_reinigung * lohn", ["intern"]),
    ("oekon", "Spanende Vorbereitung", "t_vorbereitung * (lohn + msr_zerspanung)", ["intern"]),
    ("oekon", "Materialauftrag, Arbeit und Anlage", "t_auftrag * (lohn + msr_auftrag)", ["intern"]),
    ("oekon", "Zusatzwerkstoff", "auftragsmasse * drahtpreis", ["intern"]),
    ("oekon", "Schutzgas", "gas_m3 * gaspreis", ["intern"]),
    ("oekon", "Strom", "strom_kwh * strompreis", ["intern"]),
    ("oekon", "Spanende Endbearbeitung", "t_endbearbeitung * (lohn + msr_zerspanung)", ["intern"]),
    ("oekon", "Prüfung", "t_pruefung * lohn", ["intern"]),
    ("oekon", "Gemeinkosten", "t_maschine * gk_satz", ["intern"]),
    ("oekon", "Entgelt des Dienstleisters", 'kosten("intern") * (1 + aufschlag)', ["extern"]),
    ("oekon", "Transport hin und zurück", "2 * fracht_je_teil", ["extern"]),
    ("oekon", "Beauftragung und Abnahme", "t_fremdvergabe * lohn", ["extern"]),
    ("oekon", "Einstandspreis", "masse * neuteilpreis_kg", ["neuteil"]),
    ("oekon", "Anliefertransport", "fracht_je_teil", ["neuteil"]),
    ("oekon", "Schrotterlös Altteil", "-masse * schrotterloes", ["neuteil", "ausscheiden"]),
    # Ökologische Dimension, Tabelle 12, Formel (8)
    ("oekol", "Zusatzwerkstoff", "auftragsmasse * e_draht", _AUF),
    ("oekol", "Strom für den Materialauftrag", "auftragsmasse * w_auftrag * f_strom", _AUF),
    ("oekol", "Schutzgas", "argon_kg * e_argon", _AUF),
    ("oekol", "Spanende Vor- und Endbearbeitung",
     "auftragsmasse * e_schruppen + auftragsmasse * anteil_endbearbeitung * e_schlichten", _AUF),
    ("oekol", "Reinigung des Altteils", "flaeche_reinigung * w_reinigung * f_strom", _AUF),
    ("oekol", "Transport", "masse / 1000 * 2 * entfernung * e_lkw", ["extern"]),
    ("oekol", "Stahlerzeugung für das Rohteil", "rohteil * e_stahl", ["neuteil"]),
    ("oekol", "Warmumformung", "rohteil * e_warm", ["neuteil"]),
    ("oekol", "Zerspanung des Rohteils", "(rohteil - masse) * e_schruppen", ["neuteil"]),
    ("oekol", "Transport", "masse / 1000 * entfernung * e_lkw", ["neuteil"]),
    ("oekol", "Entsorgung des Altteils", "masse * e_schrott", ["neuteil", "ausscheiden"]),
    ("oekol", "Gutschrift Schrott des Altteils", "-masse * gutschrift_schrott", ["neuteil", "ausscheiden"]),
]

# Grenzen der Spannen, die für die interne Wiederaufbereitung am ungünstigsten sind (Szenario S11,
# ermittelt wie in Abschnitt 4.5 der Arbeit)
# Schlüssel sind Parameternamen der Referenzimplementierung (FELDNAME für das Fallmodell)
UNGUENSTIG_INTERN = {
    "auftrag": 3.1, "drahtpreis": 18.3, "abscheiderate": 0.94, "mrr_schruppen": 9.4, "mrr_schlichten": 1.3,
    "gk_satz": 23.7, "neuteilpreis_kg": 5.41, "aufschlag": 0.021, "entfernung": 50.0, "losgroesse": 84.0,
    "t_reinigung": 1.0, "t_pruefung": 1.5, "t_fremdvergabe": 0.25, "anteil_endbearbeitung": 1.0,
    "w_auftrag": 23.7 / 3.6, "flaeche_reinigung": 2.0, "e_stahl": 0.5508, "e_warm": 0.20748, "e_lkw": 0.047,
    "ausnutzung": 1.1, "ausschuss": 0.5,
}


def _alternativen_standard() -> list[Alternative]:
    return [Alternative("intern", NAMEN["intern"], "aufbereitung"),
            Alternative("extern", NAMEN["extern"], "aufbereitung"),
            Alternative("neuteil", NAMEN["neuteil"], "neuteil"),
            Alternative("ausscheiden", NAMEN["ausscheiden"], "ausscheiden")]


def _bausteine_standard() -> Bausteine:
    return Bausteine(lieferzeit={a: f"lieferzeit_{a}" for a in ("intern", "extern", "neuteil")},
                     frist="frist", strafe_tag="strafe_tag", strafe_max="strafe_max",
                     stillstand_tag="stillstand_tag", ausschuss="ausschuss", rueckfall="neuteil")


def referenzmodell() -> Fallmodell:
    """Referenzfall Kurbelwelle aus Kapitel 4 mit den Einflussfaktoren und Szenarien aus Tabelle 20."""
    fall, p = Fall(), referenzparameter()
    felder = [Feld(FELDNAME.get(k, k), _FELDER[k][0], v.wert, v.einheit, v.herkunft, v.quelle, v.spanne,
                   _FELDER[k][1], v.text)
              for k, v in p.items() if k in _FELDER]
    m = Fallmodell(
        name="Referenzfall Kurbelwelle",
        beschreibung="Referenzfall aus Kapitel 4 der Masterarbeit: Kurbelwelle eines "
                     "Sechszylinder-Nutzfahrzeugdieselmotors, Verschleiß mittleren Grades.",
        stammdaten=Stammdaten(fall.bauteil, fall.werkstoff, fall.werkstoffklasse, fall.schadenstyp,
                              fall.schadensgrad),
        gate=Gate(fall.bauteil_aufbereitbar, fall.ersatzbedarf, fall.neuteil_verfuegbar),
        alternativen=_alternativen_standard(),
        felder=felder,
        hilfsgroessen=[Hilfsgroesse(n, b, f, e, "Zwischengrößen") for n, b, f, e in _HILFSGROESSEN],
        positionen=[Position(d, b, f, list(a)) for d, b, f, a in _POSITIONEN],
        unterkriterien=[
            Unterkriterium("technologie", "Technologieverfügbarkeit", 0.25,
                           {"intern": fall.tv_intern, "extern": fall.tv_extern}),
            Unterkriterium("prozess", "Prozessfähigkeit", 0.25,
                           {"intern": fall.pf_intern, "extern": fall.pf_extern}),
            Unterkriterium("schadensgrad", "Beherrschbarkeit des Schadensgrads", 0.25, ableitung="schadensgrad"),
            Unterkriterium("werkstoff", "Werkstoffeignung", 0.25, ableitung="werkstoffeignung"),
        ],
        gewichte={"tech": 1 / 3, "oekon": 1 / 3, "oekol": 1 / 3},
        bausteine=_bausteine_standard(),
        s_tech_ohne_verfahren=fall.s_tech_ohne_verfahren,
    )
    zusatz = {"Schleifen statt Schlichten": "3.9 - 1.0 * 0.27",
              "Wärmebehandlung, elektrisch 124 MJ": "124 / 3.6 * 0.414",
              "Thermische Vorbehandlung, 5,6 kg Diesel": "5.6 * 44 / 12"}
    m.faktoren = [
        Einflussfaktor("lz_engpass", "Lieferengpass Neuteil", "wertaenderung",
                       "Neuteil 20 AT, intern 5 AT, extern 8 AT, Frist 10 AT",
                       setzen={"lieferzeit_neuteil": 20, "lieferzeit_intern": 5, "lieferzeit_extern": 8,
                               "frist": 10}),
        Einflussfaktor("lz_ausgelastet", "Werkstatt ausgelastet", "wertaenderung",
                       "intern 15 AT, extern 8 AT, Neuteil 2 AT, Frist 5 AT",
                       setzen={"lieferzeit_neuteil": 2, "lieferzeit_intern": 15, "lieferzeit_extern": 8,
                               "frist": 5}),
        Einflussfaktor("strafe", "Vertragsstrafe nach VDMA", "wertaenderung",
                       "100 € je Arbeitstag, entspricht einem Auftragswert von 100.000 €, Obergrenze 5.000 €",
                       setzen={"strafe_tag": 100, "strafe_max": 5000}),
        Einflussfaktor("frist_hart", "Frist als Ausschlusskriterium", "einstellung",
                       "Alternativen mit Lieferzeit über der Frist scheiden aus", einstellungen={"harte_frist": 1}),
        Einflussfaktor("frist_8", "Frist 8 Arbeitstage", "wertaenderung", setzen={"frist": 8}),
        Einflussfaktor("ausschuss_50", "Ausschussrisiko 50 %", "wertaenderung",
                       "Aufbereitbarkeitsquote 50 % nach Sutherland et al. (2008, S. 7)", setzen={"ausschuss": 0.5}),
        Einflussfaktor("neuteil_weg", "Neuteil nicht lieferbar", "einstellung",
                       einstellungen={"neuteil_verfuegbar": 0}),
        Einflussfaktor("vermiedene_last", "Vermiedene Last statt Cut-off", "wertaenderung",
                       "Gutschrift 1,6314 kg CO₂-Äq je kg Schrott", setzen={"gutschrift_schrott": 2.1822 - 0.5508}),
        Einflussfaktor("elektrostahl", "Neuteil aus Elektrostahl", "wertaenderung",
                       "Elektrolichtbogenofen statt Konverter", setzen={"e_stahl": 0.5508}),
        Einflussfaktor("zusatzpositionen", "Zusatzpositionen der Wiederaufbereitung", "zuschlag",
                       "Obergrenzen aus Abschnitt 4.3.3",
                       positionen=[Position("oekol", b, f, list(_AUF)) for b, f in zusatz.items()]),
        Einflussfaktor("konvention", "Neuteil technisch auf unterster Stufe", "einstellung",
                       "Prüfung der Konvention aus Abschnitt 4.3.1", einstellungen={"s_tech_ohne_verfahren": 1}),
        Einflussfaktor("ungunst", "Alle Spannen ungünstig für intern", "wertaenderung",
                       "Jede Spanne an der für die interne Wiederaufbereitung ungünstigen Grenze",
                       setzen={FELDNAME.get(k, k): x for k, x in UNGUENSTIG_INTERN.items()}),
    ]
    basis = bewerte_modell(m)
    m.szenarien = [
        Szenario("S0", "Referenzfall"),
        Szenario("S1", "Lieferengpass Neuteil", ["lz_engpass", "strafe"]),
        Szenario("S2", "Werkstatt ausgelastet", ["lz_ausgelastet", "strafe"]),
        Szenario("S3a", "Harte Frist 5 AT", ["lz_ausgelastet", "frist_hart"]),
        Szenario("S3b", "Harte Frist 8 AT", ["lz_ausgelastet", "frist_8", "frist_hart"]),
        Szenario("S4", "Ausschussrisiko", ["ausschuss_50"]),
        Szenario("S5", "Ausschussrisiko und Verzug", ["ausschuss_50", "lz_ausgelastet", "strafe"]),
        Szenario("S6", "Neuteil nicht lieferbar", ["neuteil_weg"]),
        Szenario("S7a", "CO₂-Kostensatz 350 €/t", gewichte=gewichte_fuer_kostensatz(basis, 350),
                 beschreibung="Umweltbundesamt, 1 % Zeitpräferenz (Eser et al. 2025, S. 10–11)"),
        Szenario("S7b", "CO₂-Kostensatz 1.000 €/t", gewichte=gewichte_fuer_kostensatz(basis, 1000),
                 beschreibung="Umweltbundesamt, 0 % Zeitpräferenz (Eser et al. 2025, S. 10–11)"),
        Szenario("S8a", "Kostenbetont", gewichte={"tech": 0.2, "oekon": 0.6, "oekol": 0.2}),
        Szenario("S8b", "Ökologiebetont", gewichte={"tech": 0.2, "oekon": 0.2, "oekol": 0.6}),
        Szenario("S8c", "Technikbetont", gewichte={"tech": 0.6, "oekon": 0.2, "oekol": 0.2}),
        Szenario("S9a", "Vermiedene Last", ["vermiedene_last"]),
        Szenario("S9b", "Neuteil aus Recyclingstahl", ["elektrostahl"]),
        Szenario("S9c", "Zusatzpositionen der Wiederaufbereitung", ["zusatzpositionen"]),
        Szenario("S10", "Technische Konvention", ["konvention"]),
        Szenario("S11", "Ungünstigste Kombination", ["ungunst"]),
    ]
    return m


def leere_vorlage(name: str = "Neuer Fall") -> Fallmodell:
    """Vorlage für ein anderes Bauteil: Alternativen, Unterkriterien, Bausteine und die Felder der
    Faktorbausteine, aber keine Positionen. Kosten- und CO₂-Positionen legt der Anwender an."""
    ref = referenzmodell()
    felder = [f for f in ref.felder if f.gruppe == "Einflussfaktoren"]
    felder.insert(0, Feld("masse", "Masse des Bauteils", 1.0, "kg", "N", gruppe="Bauteil und Auftrag"))
    for f in felder:
        if f.herkunft != "N":
            f.herkunft, f.quelle = "A", "Vorlage, neutral"
    return Fallmodell(
        name=name,
        stammdaten=Stammdaten(),
        gate=Gate(),
        alternativen=_alternativen_standard(),
        felder=felder,
        hilfsgroessen=[],
        positionen=[],
        unterkriterien=[Unterkriterium(u.schluessel, u.name, u.gewicht,
                                       {"intern": 3, "extern": 3} if not u.ableitung else {}, u.ableitung)
                        for u in ref.unterkriterien],
        gewichte={"tech": 1 / 3, "oekon": 1 / 3, "oekol": 1 / 3},
        bausteine=_bausteine_standard(),
        szenarien=[Szenario("S0", "Basisfall")],
    )
