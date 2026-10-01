"""FastAPI über kern.modell und kern.sensitivitaet. Keine Rechnung in dieser Schicht."""
from __future__ import annotations

import math
import os
from dataclasses import asdict
from itertools import combinations

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.anfragen import (
    AlternativenAnfrage,
    AlternativenAntwort,
    BausteineAntwort,
    BausteinText,
    BewertenAnfrage,
    DateiAnfrage,
    DreieckAnfrage,
    DreieckAntwort,
    DreieckPunkt,
    FallFormel,
    FallFormelnAntwort,
    FormelAntwort,
    FormelZeichen,
    GewichteAntwort,
    GewichteDimensionAnfrage,
    GewichteKostensatzAnfrage,
    GlossarEintrag,
    KarteAnfrage,
    KarteAntwort,
    KatalogAntwort,
    KipppunktAnfrage,
    KipppunktAntwort,
    KipppunktEintrag,
    LatexAnfrage,
    LatexAntwort,
    SzenarioAntwort,
    TornadoAnfrage,
    TornadoAntwort,
    TornadoZeile,
    TutorialAntwort,
    VerlaufAnfrage,
    VerlaufAntwort,
    VerlaufPunkt,
)
from api import export
from api.inhalte.formeln import GLOSSAR, LINKS_POSITION, METHODE
from api.katalog import BAUSTEIN, BEREICH, EINSTELLUNG, FAKTORTYP, FAKTORTYP_HILFE, RASTER, RASTER_TITEL
from api.schema import (
    FallDateiFehler,
    MeldungModell,
    ModellErgebnisModell,
    WasserfallStufeModell,
    antwort,
    aus_dict,
    meldungen_antwort,
)
from api.tutorial_daten import tutorial_inhalt
from kern import sensitivitaet
from kern.ausdruck import FormelFehler, als_latex
from kern.modell import (
    ABLEITUNGEN,
    ARTEN_NAMEN,
    EINHEIT,
    Alternative,
    Fallmodell,
    alternativen_setzen,
    austauschrate,
    bausteine_werte,
    bewerte_modell,
    gewichte_fuer_kostensatz,
    leere_vorlage,
    mit_dimensionsgewicht,
    modell_zu_dict,
    pruefe_modell,
    referenzmodell,
    vergleich_szenarien,
    wasserfall,
)

VERLAUF_PUNKTE = 101

_DEFAULT_ORIGINS = "http://localhost:3000"


def _erlaubte_origins() -> list[str]:
    roh = os.environ.get("ALLOWED_ORIGINS", _DEFAULT_ORIGINS)
    return [o.strip() for o in roh.split(",") if o.strip()]


app = FastAPI(
    title="Wiederaufbereitungsalternativen",
    description="Dünne API über den unveränderten Rechenkern. Zahlen kommen aus kern/.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_erlaubte_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(FallDateiFehler)
async def _falldatei_fehler(_: Request, exc: FallDateiFehler) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(FormelFehler)
async def _formel_fehler(_: Request, exc: FormelFehler) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(KeyError)
async def _schluessel_fehler(_: Request, exc: KeyError) -> JSONResponse:
    name = exc.args[0] if exc.args else ""
    return JSONResponse(
        status_code=422,
        content={"detail": f"Unbekannter Schlüssel „{name}“."},
    )


@app.exception_handler(ValueError)
async def _wert_fehler(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


def _modell(datei: dict) -> Fallmodell:
    return aus_dict(datei)


def _gewichtsprofile() -> dict[str, dict[str, float]]:
    """Voreinstellungen der Gewichtsprofile (Konstanten aus dem Referenzmodell)."""
    ref = referenzmodell()
    aus: dict[str, dict[str, float]] = {"Gleich": dict(ref.gewichte)}
    for s in ref.szenarien:
        if s.schluessel in ("S8a", "S8b", "S8c") and s.gewichte:
            aus[f"{s.name} ({s.schluessel})"] = dict(s.gewichte)
    return aus


@app.get("/referenzmodell")
def get_referenzmodell() -> dict:
    return modell_zu_dict(referenzmodell())


@app.get("/vorlage")
def get_vorlage(name: str = "Neuer Fall") -> dict:
    return modell_zu_dict(leere_vorlage(name))


@app.get("/katalog", response_model=KatalogAntwort)
def get_katalog() -> KatalogAntwort:
    """Konstanten für die Oberfläche – keine Rechnung."""
    return KatalogAntwort(
        bereich={k: list(v) for k, v in BEREICH.items()},
        gewichtsprofile=_gewichtsprofile(),
        arten=dict(ARTEN_NAMEN),
        ableitungen=dict(ABLEITUNGEN),
        raster={k: {str(s): t for s, t in stufen.items()} for k, stufen in RASTER.items()},
        raster_titel=dict(RASTER_TITEL),
        faktortypen=dict(FAKTORTYP),
        faktortyp_hilfe=dict(FAKTORTYP_HILFE),
        einstellungen=dict(EINSTELLUNG),
        bausteine={k: BausteinText(bezeichnung=b, einheit=e) for k, (b, e) in BAUSTEIN.items()},
    )


@app.get("/formeln", response_model=list[FormelAntwort])
def get_formeln() -> list[FormelAntwort]:
    """Formeln der Methode mit Zeichenerklärung (Wortlaut aus Kapitel 4, nur Text und LaTeX)."""
    return [
        FormelAntwort(
            nummer=f.nummer,
            titel=f.titel,
            abschnitt=f.abschnitt,
            latex=f.latex,
            zeichen=[FormelZeichen(zeichen=z, text=e) for z, e in f.zeichen],
            hinweis=f.hinweis,
        )
        for f in METHODE
    ]


@app.get("/glossar", response_model=list[GlossarEintrag])
def get_glossar() -> list[GlossarEintrag]:
    """Begriffe wie in Kapitel 4 der Arbeit, in der Reihenfolge der Arbeit (nur Text)."""
    return [GlossarEintrag(begriff=b, erklaerung=e, abschnitt=a) for b, e, a in GLOSSAR]


@app.get("/tutorial", response_model=TutorialAntwort)
def get_tutorial() -> TutorialAntwort:
    """Einführung: zehn Stationen über den Referenzfall, Zahlen aus kern/ (api/tutorial_daten.py)."""
    return TutorialAntwort.model_validate(tutorial_inhalt())


@app.post("/latex", response_model=LatexAntwort)
def post_latex(anfrage: LatexAnfrage) -> LatexAntwort:
    """LaTeX-Darstellung einer Formel (Anzeige über kern.ausdruck.als_latex)."""
    return LatexAntwort(latex=als_latex(anfrage.formel))


def _latex_oder_fehler(formel: str) -> tuple[str, str | None]:
    try:
        return als_latex(formel), None
    except FormelFehler as f:
        return "", str(f)


@app.post("/latex/fall", response_model=FallFormelnAntwort)
def post_latex_fall(anfrage: DateiAnfrage) -> FallFormelnAntwort:
    """Hilfsgrößen und Positionen des Falls als LaTeX (Anzeige über kern.ausdruck.als_latex). Eine nicht darstellbare Formel kommt mit fehler zurück, die übrigen mit LaTeX."""
    m = _modell(anfrage.datei)
    hilfsgroessen = []
    for h in m.hilfsgroessen:
        latex, fehler = _latex_oder_fehler(h.formel)
        hilfsgroessen.append(FallFormel(
            art="hilfsgroesse", name=h.name, bezeichnung=h.bezeichnung, einheit=h.einheit, formel=h.formel,
            links_latex=als_latex(h.name) if h.name.isidentifier() else h.name, latex=latex, fehler=fehler))
    positionen = []
    for dim in EINHEIT:
        for p in m.positionen:
            if p.dimension != dim:
                continue
            latex, fehler = _latex_oder_fehler(p.formel)
            positionen.append(FallFormel(
                art="position", bezeichnung=p.bezeichnung, einheit=EINHEIT[dim], dimension=dim,
                alternativen=list(p.alternativen), formel=p.formel, links_latex=LINKS_POSITION[EINHEIT[dim]],
                latex=latex, fehler=fehler))
    return FallFormelnAntwort(hilfsgroessen=hilfsgroessen, positionen=positionen)


def _csv_antwort(daten: bytes, dateiname: str) -> Response:
    return Response(content=daten, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{dateiname}"'})


@app.post("/export/felder.csv", response_class=Response)
def post_export_felder(anfrage: DateiAnfrage) -> Response:
    """Alle Felder mit Wert, Einheit, Herkunft, Quelle und Spanne (api/export.py)."""
    return _csv_antwort(export.felder_csv(_modell(anfrage.datei)), "felder.csv")


@app.post("/export/ergebnisse.csv", response_class=Response)
def post_export_ergebnisse(anfrage: DateiAnfrage) -> Response:
    """Basisfall und alle Szenarien je Alternative, ungerundet (api/export.py über
    kern.modell.vergleich_szenarien). Gesperrt, solange der Fall Prüffehler enthält."""
    m = _modell(anfrage.datei)
    fehler = [x for x in pruefe_modell(m) if x.stufe == "fehler"]
    if fehler:
        raise ValueError(
            "Die Ergebnisse lassen sich erst exportieren, wenn der Fall keine Fehler enthält. "
            f"Erste Meldung: {fehler[0].ort}: {fehler[0].text}"
        )
    return _csv_antwort(export.ergebnisse_csv(m), "ergebnisse.csv")


@app.post("/gewichte/dimension", response_model=GewichteAntwort)
def post_gewichte_dimension(anfrage: GewichteDimensionAnfrage) -> GewichteAntwort:
    """Setzt ein Dimensionsgewicht und verteilt den Rest im bisherigen Verhältnis."""
    if anfrage.dimension not in anfrage.gewichte:
        raise KeyError(anfrage.dimension)
    try:
        neu = mit_dimensionsgewicht(anfrage.gewichte, anfrage.dimension, anfrage.wert)
    except ZeroDivisionError as e:
        raise ValueError(
            "Die übrigen Gewichte sind alle null; das Verhältnis lässt sich nicht anpassen."
        ) from e
    return GewichteAntwort(gewichte=neu)


@app.post("/gewichte/kostensatz", response_model=GewichteAntwort)
def post_gewichte_kostensatz(anfrage: GewichteKostensatzAnfrage) -> GewichteAntwort:
    """Dimensionsgewichte, deren implizite Austauschrate dem CO₂-Kostensatz entspricht."""
    m = _modell(anfrage.datei)
    e = bewerte_modell(m, anfrage.szenario)
    if austauschrate(e) is None:
        raise ValueError(
            "Der Kostensatz lässt sich nur für ein gültiges Ergebnis mit mindestens zwei "
            "Alternativen umrechnen."
        )
    return GewichteAntwort(gewichte=gewichte_fuer_kostensatz(e, anfrage.eur_je_t))


@app.post("/alternativen", response_model=AlternativenAntwort)
def post_alternativen(anfrage: AlternativenAnfrage) -> AlternativenAntwort:
    """Alternativenliste setzen; Schlüssel in Positionen, Stufen und Lieferzeit nachziehen."""
    m = _modell(anfrage.datei)
    neue = [
        Alternative(a.schluessel, a.name, a.art, a.aktiv) for a in anfrage.alternativen
    ]
    neu = alternativen_setzen(m, neue, anfrage.zuordnung)
    return AlternativenAntwort(datei=modell_zu_dict(neu))


@app.post("/pruefen", response_model=list[MeldungModell])
def post_pruefen(anfrage: DateiAnfrage) -> list[MeldungModell]:
    m = _modell(anfrage.datei)
    return meldungen_antwort(pruefe_modell(m))


@app.post("/bewerten", response_model=ModellErgebnisModell)
def post_bewerten(anfrage: BewertenAnfrage) -> ModellErgebnisModell:
    m = _modell(anfrage.datei)
    e = bewerte_modell(m, anfrage.szenario)
    aus = antwort(e, m)
    aus.wasserfall = {
        dim: {a: [WasserfallStufeModell.model_validate(asdict(x)) for x in wasserfall(e, a, dim)]
              for a in e.alternativen}
        for dim in ("oekon", "oekol")
    }
    return aus


@app.post("/bausteine", response_model=BausteineAntwort)
def post_bausteine(anfrage: BewertenAnfrage) -> BausteineAntwort:
    """Werte der Faktorbausteine (Formeln 11 bis 13) im Szenario, über kern.modell.bausteine_werte."""
    m = _modell(anfrage.datei)
    werte = bausteine_werte(m, anfrage.szenario)
    return BausteineAntwort(
        szenario=anfrage.szenario,
        werte={k: (None if math.isinf(x) else x) for k, x in werte.items()},
    )


@app.post("/tornado", response_model=TornadoAntwort)
def post_tornado(anfrage: TornadoAnfrage) -> TornadoAntwort:
    m = _modell(anfrage.datei)
    zeilen = sensitivitaet.tornado(m, anfrage.a, anfrage.b, anfrage.szenario)
    abstand = sensitivitaet.paarabstand(m, anfrage.a, anfrage.b, anfrage.szenario)
    return TornadoAntwort(
        zeilen=[
            TornadoZeile(
                feld=name,
                untergrenze=lo,
                obergrenze=hi,
                abstand_unten=a_lo,
                abstand_oben=a_hi,
            )
            for name, lo, hi, a_lo, a_hi in zeilen
        ],
        abstand=abstand,
    )


@app.post("/verlauf", response_model=VerlaufAntwort)
def post_verlauf(anfrage: VerlaufAnfrage) -> VerlaufAntwort:
    """Verlauf über [lo, hi] und Kipppunkte aller Paare zulässiger Alternativen."""
    m = _modell(anfrage.datei)
    xs = sensitivitaet.raster(anfrage.lo, anfrage.hi, VERLAUF_PUNKTE)
    punkte = sensitivitaet.verlauf_modell(m, anfrage.groesse, xs, anfrage.szenario)
    alts = [a.schluessel for a in m.alternativen if any(a.schluessel in s for _, s in punkte)]
    kipp: list[KipppunktEintrag] = []
    for a, b in combinations(alts, 2):
        x = sensitivitaet.kipppunkt_modell(
            m, anfrage.groesse, anfrage.lo, anfrage.hi, a, b, anfrage.szenario
        )
        if x is not None:
            kipp.append(KipppunktEintrag(a=a, b=b, x=x))
    kipp.sort(key=lambda k: k.x)
    return VerlaufAntwort(
        punkte=[VerlaufPunkt(x=x, nutzwert=n) for x, n in punkte],
        kipppunkte=kipp,
    )


@app.post("/kipppunkte", response_model=KipppunktAntwort)
def post_kipppunkte(anfrage: KipppunktAnfrage) -> KipppunktAntwort:
    m = _modell(anfrage.datei)
    x = sensitivitaet.kipppunkt_modell(
        m,
        anfrage.groesse,
        anfrage.lo,
        anfrage.hi,
        anfrage.a,
        anfrage.b,
        anfrage.szenario,
    )
    return KipppunktAntwort(kipppunkt=x)


@app.post("/karte", response_model=KarteAntwort)
def post_karte(anfrage: KarteAnfrage) -> KarteAntwort:
    m = _modell(anfrage.datei)
    xs = sensitivitaet.raster(anfrage.x_lo, anfrage.x_hi, anfrage.punkte)
    ys = sensitivitaet.raster(anfrage.y_lo, anfrage.y_hi, anfrage.punkte)
    karte = sensitivitaet.kipppunkt_karte(
        m, anfrage.feld_x, xs, anfrage.feld_y, ys, anfrage.szenario
    )
    return KarteAntwort(karte=karte, xs=xs, ys=ys)


@app.post("/dreieck", response_model=DreieckAntwort)
def post_dreieck(anfrage: DreieckAnfrage) -> DreieckAntwort:
    m = _modell(anfrage.datei)
    punkte = sensitivitaet.gewichtsdreieck(m, anfrage.schritte, anfrage.szenario)
    return DreieckAntwort(
        punkte=[
            DreieckPunkt(
                w_tech=t, w_oekon=o, w_oekol=e, rang_1=r, abstand=d
            )
            for t, o, e, r, d in punkte
        ]
    )


@app.post("/szenarien", response_model=list[SzenarioAntwort])
def post_szenarien(anfrage: DateiAnfrage) -> list[SzenarioAntwort]:
    m = _modell(anfrage.datei)
    aus: list[SzenarioAntwort] = []
    for v in vergleich_szenarien(m):
        sz = v.szenario
        aus.append(
            SzenarioAntwort(
                szenario=sz.schluessel if sz else None,
                name=sz.name if sz else "Basisfall",
                ergebnis=antwort(v.ergebnis, m) if v.ergebnis is not None else None,
                differenz=v.differenz,
                anderer_sieger=v.anderer_sieger,
                fehler=v.fehler,
            )
        )
    return aus
