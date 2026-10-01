"""Pydantic-Anfrage- und Antwortmodelle der API. Spiegeln nur die Kern-Rückgaben, ohne Rechnung."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from api.schema import ModellErgebnisModell, SchrittModell


class _Strikt(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DateiAnfrage(_Strikt):
    """Fall-Datei Version 1 oder 2 als JSON-Objekt (wie daten/referenzmodell.json)."""
    datei: dict[str, Any]


class BewertenAnfrage(DateiAnfrage):
    szenario: str | None = None


class TornadoAnfrage(BewertenAnfrage):
    a: str
    b: str


class VerlaufAnfrage(BewertenAnfrage):
    groesse: str
    lo: float
    hi: float


class KipppunktAnfrage(VerlaufAnfrage):
    a: str
    b: str


class KarteAnfrage(BewertenAnfrage):
    feld_x: str
    x_lo: float
    x_hi: float
    feld_y: str
    y_lo: float
    y_hi: float
    punkte: int = Field(ge=2, le=101)


class DreieckAnfrage(BewertenAnfrage):
    schritte: int = Field(ge=1, le=100)


class TornadoZeile(_Strikt):
    feld: str
    untergrenze: float
    obergrenze: float
    abstand_unten: float
    abstand_oben: float


class TornadoAntwort(_Strikt):
    zeilen: list[TornadoZeile]
    abstand: float


class VerlaufPunkt(_Strikt):
    x: float
    nutzwert: dict[str, float]


class KipppunktEintrag(_Strikt):
    a: str
    b: str
    x: float


class VerlaufAntwort(_Strikt):
    punkte: list[VerlaufPunkt]
    kipppunkte: list[KipppunktEintrag]


class KipppunktAntwort(_Strikt):
    kipppunkt: float | None


class KarteAntwort(_Strikt):
    karte: list[list[str | None]]
    xs: list[float]
    ys: list[float]


class DreieckPunkt(_Strikt):
    w_tech: float
    w_oekon: float
    w_oekol: float
    rang_1: str | None
    abstand: float | None


class DreieckAntwort(_Strikt):
    punkte: list[DreieckPunkt]


class SzenarioAntwort(_Strikt):
    szenario: str | None
    name: str | None = None
    ergebnis: ModellErgebnisModell | None = None
    differenz: dict[str, float] = Field(default_factory=dict)
    anderer_sieger: bool = False
    fehler: str = ""


class BausteinText(_Strikt):
    """Bezeichnung und Einheit eines Faktorbausteins (api/katalog.py, BAUSTEIN)."""
    bezeichnung: str
    einheit: str


class KatalogAntwort(_Strikt):
    """Konstanten für die Oberfläche: Bereiche, Profile, Arten, Ableitungen, Bewertungsraster,
    Typen der Einflussfaktoren, Einstellungen und Faktorbausteine."""
    bereich: dict[str, list[float]]
    gewichtsprofile: dict[str, dict[str, float]]
    arten: dict[str, str] = Field(default_factory=dict)
    ableitungen: dict[str, str] = Field(default_factory=dict)
    raster: dict[str, dict[str, str]] = Field(default_factory=dict)
    raster_titel: dict[str, str] = Field(default_factory=dict)
    faktortypen: dict[str, str] = Field(default_factory=dict)
    faktortyp_hilfe: dict[str, str] = Field(default_factory=dict)
    einstellungen: dict[str, str] = Field(default_factory=dict)
    bausteine: dict[str, BausteinText] = Field(default_factory=dict)


class BausteineAntwort(_Strikt):
    """Werte der Faktorbausteine im Szenario (kern.modell.bausteine_werte). Schlüssel frist, strafe_tag,
    strafe_max, stillstand_tag, ausschuss und lieferzeit:<Alternative>; None bei strafe_max heißt keine
    Obergrenze."""
    szenario: str | None
    werte: dict[str, float | None]


class LatexAnfrage(_Strikt):
    formel: str


class LatexAntwort(_Strikt):
    latex: str


class GewichteDimensionAnfrage(_Strikt):
    gewichte: dict[str, float]
    dimension: str
    wert: float = Field(ge=0, le=1)


class GewichteAntwort(_Strikt):
    gewichte: dict[str, float]


class GewichteKostensatzAnfrage(DateiAnfrage):
    eur_je_t: float = Field(ge=0)
    szenario: str | None = None


class AlternativeEintrag(_Strikt):
    schluessel: str
    name: str
    art: str
    aktiv: bool = True


class AlternativenAnfrage(DateiAnfrage):
    """Neue Alternativenliste mit Zuordnung alter → neuer Schlüssel (None = gelöscht)."""
    alternativen: list[AlternativeEintrag]
    zuordnung: dict[str, str | None] = Field(default_factory=dict)


class AlternativenAntwort(_Strikt):
    datei: dict[str, Any]


class FormelZeichen(_Strikt):
    """Formelzeichen in LaTeX und seine Erklärung (Formelteile darin in $…$)."""
    zeichen: str
    text: str


class FormelAntwort(_Strikt):
    """Formel der Methode aus api/inhalte/formeln.py: Nummer, Titel, Abschnitt, LaTeX und Zeichenerklärung."""
    nummer: str
    titel: str
    abschnitt: str
    latex: str
    zeichen: list[FormelZeichen]
    hinweis: str = ""


class TutorialZeichen(_Strikt):
    """Formelzeichen in LaTeX und seine Erklärung (Formelteile darin in $…$)."""
    zeichen: str
    text: str


class TutorialBalken(_Strikt):
    """Werte für ein Balkendiagramm einer Station, größte zuerst, unverändert aus dem Kern."""
    titel: str
    einheit: str
    werte: list[dict[str, str | float]]


class TutorialFormel(_Strikt):
    """Formel einer Station: allgemeine Form und eingesetzte Werte in LaTeX, Ergebnis als Text."""
    titel: str
    nummer: str = ""
    abschnitt: str = ""
    allgemein: str
    eingesetzt: str = ""
    ergebnis: str = ""
    erklaerung: str = ""
    zeichen: list[TutorialZeichen] = Field(default_factory=list)


class TutorialTabelle(_Strikt):
    """Fertig formatierte Tabelle, erste Spalte beschriftet die Zeile."""
    titel: str
    spalten: list[str]
    zeilen: list[list[str]]
    markiert: list[int] = Field(default_factory=list)


class TutorialRechenweg(_Strikt):
    titel: str
    schritte: list[SchrittModell]


class TutorialStation(_Strikt):
    nr: int
    titel: str
    abschnitt: str
    text: list[str]
    eingaben: TutorialTabelle | None = None
    formeln: list[TutorialFormel] = Field(default_factory=list)
    tabellen: list[TutorialTabelle] = Field(default_factory=list)
    rechenweg: list[TutorialRechenweg] = Field(default_factory=list)
    kipppunkte: list[KipppunktEintrag] = Field(default_factory=list)
    satz: str = ""
    balken: TutorialBalken | None = None


class TutorialStufe(_Strikt):
    titel: str
    text: str


class TutorialAntwort(_Strikt):
    """Einführung über den Referenzfall. Zahlen aus kern/, nur formatiert."""
    stationen: list[TutorialStation]
    stufen: list[TutorialStufe]
    rundung: str


class GlossarEintrag(_Strikt):
    """Begriff wie in Kapitel 4 der Arbeit (api/inhalte/formeln.py, GLOSSAR)."""
    begriff: str
    erklaerung: str
    abschnitt: str


class FallFormel(_Strikt):
    """Hilfsgröße oder Position des Falls als LaTeX. latex ist leer und fehler gesetzt, wenn die Formel nicht
    darstellbar ist (kein Abbruch der ganzen Antwort)."""
    art: Literal["hilfsgroesse", "position"]
    name: str = ""
    bezeichnung: str
    einheit: str = ""
    dimension: str = ""
    alternativen: list[str] = Field(default_factory=list)
    formel: str
    links_latex: str
    latex: str = ""
    fehler: str | None = None


class FallFormelnAntwort(_Strikt):
    """Formeln des Falls in der Reihenfolge des Modells, ökonomische Positionen vor ökologischen."""
    hilfsgroessen: list[FallFormel]
    positionen: list[FallFormel]
