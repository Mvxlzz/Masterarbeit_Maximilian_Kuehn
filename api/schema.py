"""Datenvertrag der Fall-Datei: Pydantic-Spiegel des Fallmodells.

Version 2 (`kpi-remanufacturing-modell`) ist das Fallmodell aus kern.modell als JSON. Version 1
(`kpi-remanufacturing-fall`, daten/referenzfall.json) wird weiter gelesen und vom Kern auf das
Referenzmodell übertragen. Die Modelle prüfen Aufbau und Wertebereiche und liefern deutsche
Meldungen. Umgewandelt wird ausschließlich mit kern.modell.modell_aus_dict und modell_zu_dict.
Die Modelle sind später unverändert der Request- und Response-Vertrag einer FastAPI.
"""
from __future__ import annotations

import json
import math
from dataclasses import asdict
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from kern.ausdruck import FormelFehler
from kern.matching import SCHADENSGRAD_SCORE, SCHADENSTYPEN, WERKSTOFFKLASSEN
from kern.modell import (ABLEITUNGEN, ARTEN, EINSTELLUNGEN, FAKTORTYPEN, FORMAT, VERSION, Fallmodell,
                         Meldung, modell_aus_dict, modell_zu_dict, pruefe_modell)

FORMAT_V1 = "kpi-remanufacturing-fall"
WURZEL = Path(__file__).resolve().parents[1]
REFERENZMODELL_DATEI = WURZEL / "daten" / "referenzmodell.json"
REFERENZFALL_DATEI = WURZEL / "daten" / "referenzfall.json"

Stufe = Annotated[int, Field(ge=1, le=5)]
Gewicht = Annotated[float, Field(ge=0, le=1)]


class _Modell(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------------------------------------------------------------- Version 2

class FeldModell(_Modell):
    name: str
    bezeichnung: str
    wert: float | None  # None: unbegrenzt, nur für die Obergrenze der Vertragsstrafe
    einheit: str = ""
    herkunft: Literal["L", "A", "N"] = "N"
    quelle: str = ""
    spanne: tuple[float, float] | None = None
    gruppe: str = ""
    text: str = ""

    @field_validator("wert")
    @classmethod
    def _keine_nan(cls, v: float | None) -> float | None:
        if v is not None and (math.isnan(v) or math.isinf(v)):
            raise ValueError("Wert fehlt oder ist keine endliche Zahl")
        return v

    @field_validator("spanne")
    @classmethod
    def _spanne_geordnet(cls, v: tuple[float, float] | None) -> tuple[float, float] | None:
        if v is not None and v[0] > v[1]:
            raise ValueError("Untergrenze der Spanne liegt über der Obergrenze")
        return v


class HilfsgroesseModell(_Modell):
    name: str
    bezeichnung: str
    formel: str
    einheit: str = ""
    gruppe: str = ""


class AlternativeModell(_Modell):
    schluessel: str
    name: str
    art: Literal[ARTEN]
    aktiv: bool = True


class PositionModell(_Modell):
    dimension: Literal["oekon", "oekol"]
    bezeichnung: str
    formel: str
    alternativen: list[str]
    gruppe: str = ""


class UnterkriteriumModell(_Modell):
    schluessel: str
    name: str
    gewicht: Gewicht
    stufen: dict[str, Stufe] = Field(default_factory=dict)
    ableitung: Literal[tuple(ABLEITUNGEN)] | None = None


class GateModell(_Modell):
    bauteil_aufbereitbar: bool = True
    ersatzbedarf: bool = True
    neuteil_verfuegbar: bool = True


class BausteineModell(_Modell):
    lieferzeit: dict[str, str] = Field(default_factory=dict)
    frist: str = "0"
    strafe_tag: str = "0"
    strafe_max: str = ""
    stillstand_tag: str = "0"
    ausschuss: str = "0"
    rueckfall: str = "neuteil"
    harte_frist: bool = False


class EinflussfaktorModell(_Modell):
    schluessel: str
    name: str
    typ: Literal[FAKTORTYPEN]
    beschreibung: str = ""
    setzen: dict[str, float] = Field(default_factory=dict)
    skalieren: dict[str, float] = Field(default_factory=dict)
    positionen: list[PositionModell] = Field(default_factory=list)
    einstellungen: dict[Literal[EINSTELLUNGEN], float] = Field(default_factory=dict)


class SzenarioModell(_Modell):
    schluessel: str
    name: str
    faktoren: list[str] = Field(default_factory=list)
    gewichte: dict[Literal["tech", "oekon", "oekol"], Gewicht] | None = None
    beschreibung: str = ""


class StammdatenModell(_Modell):
    bauteil: str = ""
    werkstoff: str = ""
    werkstoffklasse: str = WERKSTOFFKLASSEN[0]
    schadenstyp: str = "Verschleiß"
    schadensgrad: str = "mittel"


class FallmodellModell(_Modell):
    name: str
    stammdaten: StammdatenModell
    gate: GateModell
    alternativen: list[AlternativeModell]
    felder: list[FeldModell]
    hilfsgroessen: list[HilfsgroesseModell] = Field(default_factory=list)
    positionen: list[PositionModell] = Field(default_factory=list)
    unterkriterien: list[UnterkriteriumModell]
    gewichte: dict[Literal["tech", "oekon", "oekol"], Gewicht]
    bausteine: BausteineModell
    faktoren: list[EinflussfaktorModell] = Field(default_factory=list)
    szenarien: list[SzenarioModell] = Field(default_factory=list)
    s_tech_ohne_verfahren: Annotated[float, Field(ge=1, le=5)] = 5.0
    eignung: dict[str, list[Stufe]]
    werkstoffklassen: list[str]
    schadensgrad_score: dict[str, Stufe]
    beschreibung: str = ""

    @model_validator(mode="after")
    def _stimmig(self) -> "FallmodellModell":
        for typ, zeile in self.eignung.items():
            if len(zeile) != len(self.werkstoffklassen):
                raise ValueError(f"Tabelle 5, Zeile „{typ}“: {len(self.werkstoffklassen)} Werte erwartet, "
                                 f"je Werkstoffklasse einen")
        sd = self.stammdaten
        if sd.werkstoffklasse not in self.werkstoffklassen:
            raise ValueError(f"Werkstoffklasse „{sd.werkstoffklasse}“ fehlt in Tabelle 5")
        if sd.schadenstyp not in self.eignung:
            raise ValueError(f"Schadenstyp „{sd.schadenstyp}“ fehlt in Tabelle 5")
        if sd.schadensgrad not in self.schadensgrad_score:
            raise ValueError(f"Schadensgrad „{sd.schadensgrad}“ fehlt in Tabelle 3")
        obergrenze = self.bausteine.strafe_max.strip()
        for f in self.felder:
            if f.wert is None and f.name != obergrenze:
                raise ValueError(f"Feld „{f.name}“ ohne Wert. Unbegrenzt darf nur die Obergrenze der "
                                 f"Vertragsstrafe sein")
        return self


# ---------------------------------------------------------------- Antwort (Response-Vertrag, E23)
# Spiegel von kern.modell.ModellErgebnis, Schritt und Meldung für den späteren API-Vertrag (ARCHITEKTUR, Abschnitt 7):
# POST /bewerten liefert ModellErgebnisModell, POST /pruefen eine Liste von MeldungModell.

class SchrittModell(_Modell):
    bereich: str
    alternative: str | None
    bezeichnung: str
    formel: str
    werte: dict[str, float]
    ergebnis: float
    einheit: str = ""
    # Darstellung für KaTeX: nur Anzeige, keine Rechnung. Gefüllt von api.rechenweg_latex.
    links_latex: str = ""
    formel_latex: str = ""
    eingesetzt_latex: str = ""
    nummer: str = ""
    abschnitt: str = ""


class MeldungModell(_Modell):
    stufe: Literal["fehler", "warnung"]
    ort: str
    text: str


class WasserfallStufeModell(_Modell):
    position: str
    wert: float
    von: float
    bis: float
    summe: bool = False


class ModellErgebnisModell(_Modell):
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
    rangfolge: list[str] = Field(default_factory=list)
    hinweise: list[str] = Field(default_factory=list)
    rechenweg: list[SchrittModell] = Field(default_factory=list)
    szenario: str | None = None
    gewichte: dict[str, float] = Field(default_factory=dict)
    werte: dict[str, float] = Field(default_factory=dict)
    # Zwischenstände je Dimension und Alternative aus kern.modell.wasserfall, nur bei POST /bewerten gefüllt
    wasserfall: dict[str, dict[str, list[WasserfallStufeModell]]] = Field(default_factory=dict)


def antwort(e, m=None) -> ModellErgebnisModell:
    """ModellErgebnis als Antwort-Modell. Unendliche Werte (Obergrenze ohne Wert) werden im JSON zu null.

    Mit Fallmodell `m` werden die LaTeX-Darstellungsfelder je Rechenweg-Schritt gesetzt.
    """
    if m is not None:
        from api.rechenweg_latex import ergebnis_mit_latex
        return ModellErgebnisModell.model_validate(ergebnis_mit_latex(m, e))
    return ModellErgebnisModell.model_validate(asdict(e))


def meldungen_antwort(meldungen: list[Meldung]) -> list[MeldungModell]:
    return [MeldungModell.model_validate(asdict(x)) for x in meldungen]


class ModellDatei(_Modell):
    format: Literal[FORMAT]
    version: Literal[VERSION]
    modell: FallmodellModell


# ---------------------------------------------------------------- Version 1 (Fall-Datei aus P1/P2)

class ParamModellV1(BaseModel):
    model_config = ConfigDict(extra="allow")
    wert: float | None
    einheit: str = ""
    herkunft: Literal["L", "A", "N"] = "A"
    quelle: str = ""
    spanne: tuple[float, float] | None = None
    text: str = ""


class FallModellV1(BaseModel):
    model_config = ConfigDict(extra="allow")
    bauteil: str
    werkstoff: str
    werkstoffklasse: Literal[WERKSTOFFKLASSEN]
    schadenstyp: Literal[SCHADENSTYPEN]
    schadensgrad: Literal[tuple(SCHADENSGRAD_SCORE)]
    bauteil_aufbereitbar: bool
    ersatzbedarf: bool
    neuteil_verfuegbar: bool
    tv_intern: Stufe
    tv_extern: Stufe
    pf_intern: Stufe
    pf_extern: Stufe
    harte_frist: bool
    s_tech_ohne_verfahren: Annotated[float, Field(ge=1, le=5)]
    eignungstabelle: dict[Literal[SCHADENSTYPEN], list[Stufe]] | None = None


class FallDateiV1(BaseModel):
    model_config = ConfigDict(extra="allow")
    format: Literal[FORMAT_V1]
    version: Literal[1]
    beschreibung: str = ""
    fall: FallModellV1
    gewichte: dict[str, Gewicht]
    parameter: dict[str, ParamModellV1]


# ---------------------------------------------------------------- Laden und Speichern

class FallDateiFehler(ValueError):
    """Die Datei ist keine gültige Fall-Datei. Die Meldung ist für die Oberfläche formuliert."""


_TEXTE = {
    "missing": "fehlt",
    "literal_error": "unzulässiger Wert",
    "float_parsing": "keine Zahl",
    "float_type": "keine Zahl",
    "int_parsing": "keine ganze Zahl",
    "int_type": "keine ganze Zahl",
    "int_from_float": "keine ganze Zahl",
    "bool_parsing": "kein Wahrheitswert",
    "bool_type": "kein Wahrheitswert",
    "string_type": "kein Text",
    "list_type": "keine Liste",
    "dict_type": "kein Objekt",
    "greater_than_equal": "Wert zu klein",
    "less_than_equal": "Wert zu groß",
    "too_short": "zu wenige Werte",
    "too_long": "zu viele Werte",
    "extra_forbidden": "unbekannter Schlüssel",
}


def _meldung(fehler: ValidationError) -> str:
    zeilen = []
    for f in fehler.errors()[:8]:
        ort = ".".join(str(t) for t in f["loc"]) or "Datei"
        if f["type"] == "value_error":
            text = str(f.get("ctx", {}).get("error", f["msg"]))
        elif f["type"] == "literal_error":
            text = f"unzulässiger Wert, erlaubt: {f.get('ctx', {}).get('expected', '')}"
        else:
            text = _TEXTE.get(f["type"], f["msg"])
        zeilen.append(f"{ort}: {text}")
    rest = len(fehler.errors()) - len(zeilen)
    return ("Die Datei ist keine gültige Fall-Datei. " + "; ".join(zeilen)
            + (f"; und {rest} weitere Fehler." if rest > 0 else "."))


def aus_dict(roh: Any) -> Fallmodell:
    """Prüft ein eingelesenes JSON-Objekt und baut daraus ein Fallmodell. Wirft FallDateiFehler."""
    if not isinstance(roh, dict):
        raise FallDateiFehler("Die Datei ist keine gültige Fall-Datei. Erwartet wird ein JSON-Objekt.")
    vertrag = FallDateiV1 if roh.get("format") == FORMAT_V1 else ModellDatei
    try:
        vertrag.model_validate(roh)
    except ValidationError as f:
        raise FallDateiFehler(_meldung(f)) from f
    try:
        return modell_aus_dict(roh)
    except (FormelFehler, KeyError, TypeError, ValueError) as f:
        raise FallDateiFehler(f"Die Datei ist keine gültige Fall-Datei. {f}") from f


def fehler(m: Fallmodell) -> list[Meldung]:
    """Prüfmeldungen der Stufe „fehler“ aus kern.modell.pruefe_modell."""
    return [x for x in pruefe_modell(m) if x.stufe == "fehler"]


def laden(inhalt: str | bytes) -> Fallmodell:
    """Liest eine Fall-Datei (Version 1 oder 2). Ein Modell mit Prüffehlern wird abgelehnt, damit nach
    dem Laden immer ein gültiger Stand vorliegt."""
    try:
        roh = json.loads(inhalt)
    except (json.JSONDecodeError, UnicodeDecodeError) as f:
        raise FallDateiFehler(f"Die Datei ist kein gültiges JSON ({f}).") from f
    m = aus_dict(roh)
    probleme = fehler(m)
    if probleme:
        raise FallDateiFehler("Die Datei enthält ein Fallmodell mit Fehlern. "
                              + "; ".join(f"{x.ort}: {x.text}" for x in probleme[:5]))
    return m


def speichern(m: Fallmodell) -> str:
    """Fall-Datei Version 2 als JSON-Text, Format wie daten/referenzmodell.json."""
    d = modell_zu_dict(m)
    ModellDatei.model_validate(d)  # was gespeichert wird, lässt sich wieder laden
    return json.dumps(d, ensure_ascii=False, indent=1, allow_nan=False) + "\n"
