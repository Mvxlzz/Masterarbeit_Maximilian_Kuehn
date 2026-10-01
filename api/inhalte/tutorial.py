"""Texte und Reihenfolge der zehn Tutorial-Stationen und das Schaubild der vier
Verarbeitungsstufen (Abschnitt 4.1, Abbildung 3).

Nur Text. Keine Zahlen des Falls: api/tutorial_daten.py setzt alle Werte live aus kern.modell ein.
"""
from __future__ import annotations

from dataclasses import dataclass
from html import escape


@dataclass(frozen=True)
class Station:
    titel: str
    abschnitt: str
    text: tuple[str, ...]            # zwei bis vier Sätze, als Absätze
    gruppen: tuple[str, ...] = ()    # Feldgruppen des Datenblatts, die als Eingaben der Station erscheinen


STATIONEN: tuple[Station, ...] = (
    Station("Worum es geht", "Abschnitt 4.1",
            ("Bewertet wird ein Core, dessen grundsätzliche Eignung für die Wiederaufbereitung festgestellt ist und "
             "für den ein konkretes Schadensbild vorliegt. Die Frage lautet nicht, ob das Bauteil aufbereitet werden "
             "kann, sondern welche Alternative unter den gegebenen technischen, ökonomischen und ökologischen "
             "Bedingungen die vorteilhafteste ist.",
             "Der Verarbeitungsweg gliedert sich in vier aufeinander aufbauende Stufen. Die vierte Stufe ist kein "
             "Endpunkt, sondern eine Rückkopplung: Sie variiert Eingaben und Gewichte und durchläuft die "
             "Aggregation erneut.")),
    Station("Gate und Zulässigkeit", "Abschnitte 4.1.4 und 4.2.4",
            ("Eine vorgelagerte Eignungsprüfung entscheidet über das Bauteil als Ganzes. Danach bestimmen "
             "Ersatzbedarf und Verfügbarkeit des Neuteils, welche Alternativen überhaupt zur Wahl stehen.",
             "Besteht ein Ersatzbedarf, stellt das Ausscheiden kein einsatzfähiges Bauteil bereit und entfällt. Die "
             "Gründe stehen unten im Wortlaut des Rechenkerns.")),
    Station("Eingangsmodell", "Abschnitt 4.2, Tabellen 3 und 5",
            ("Schadenstyp und Schadensgrad beschreiben das Schadensbild, die Werkstoffklasse das Bauteil. Tabelle 3 "
             "ordnet den Schadensgrad einer Stufe der fünfstufigen Skala zu.",
             "Im Capability-Matching liest Tabelle 5 aus Schadenstyp und Werkstoffklasse die Werkstoffeignung ab. "
             "Stufe 1 wäre ein Ausschlusskriterium."),
            ("Bauteil und Auftrag",)),
    Station("Technische Dimension", "Abschnitt 4.3.1, Formeln (5) und (6)",
            ("Vier Unterkriterien bewerten jeden Wiederaufbereitungsweg auf der fünfstufigen Skala: "
             "Technologieverfügbarkeit, Prozessfähigkeit, Beherrschbarkeit des Schadensgrads und Werkstoffeignung. "
             "Formel (5) gewichtet sie zum Dimensionswert, Formel (6) überführt ihn auf die Punkteskala.",
             "Neuteilersatz und Ausscheiden tragen kein Verfahrensrisiko und erhalten nach der Konvention den "
             "Höchstwert der Skala. Abschnitt 4.5.4 prüft diese Konvention im Szenario S10.")),
    Station("Ökonomische Dimension", "Abschnitt 4.3.2, Tabelle 16",
            ("Die Kosten jeder Alternative sind die Summe ihrer Positionen, jede Position eine eigene Formel über die "
             "Felder des Datenblatts. Zwischengrößen wie die Prozesszeiten stehen als Hilfsgrößen darüber.",
             "Der Dienstleister der externen Wiederaufbereitung verlangt die Herstellkosten der internen "
             "Wiederaufbereitung zuzüglich seines Aufschlags. Das Diagramm zeigt, welche Position die Kosten "
             "treibt."),
            ("Preise", "Kostensätze", "Prozessdaten")),
    Station("Ökologische Dimension", "Abschnitt 4.3.3, Formel (8), Tabelle 14",
            ("Das Treibhauspotenzial folgt Formel (8): Massen mal Emissionsfaktoren, Strom mal Emissionsfaktor des "
             "Strommixes und Transport. Im Werkzeug ist jede Position eine eigene Formel, das Treibhauspotenzial "
             "ihre Summe.",
             "Beim Neuteilersatz dominiert die Herstellung des Stahls, bei der Wiederaufbereitung nur der "
             "aufgetragene Werkstoff und der Strom."),
            ("Emissionsfaktoren", "Transport")),
    Station("Normalisierung und Gewichtung", "Abschnitte 4.4.1 und 4.4.2, Formel (9)",
            ("Kosten und Treibhauspotenzial haben verschiedene Einheiten. Formel (9) überführt sie mit der "
             "Min-Max-Normalisierung auf die Punkteskala: Die günstigste Alternative erhält hundert Punkte, die "
             "ungünstigste null.",
             "Die Gewichte der drei Dimensionen legen fest, wie stark jede Dimension zählt. Aus ihnen und den "
             "Spannen der Rohwerte folgt die implizite Austauschrate: der Betrag in Euro, den die Gewichtung einer "
             "Tonne CO₂-Äq beimisst.")),
    Station("Ergebnis", "Abschnitt 4.4.3, Formel (10), Tabellen 17 und 18",
            ("Formel (10) summiert je Alternative Gewicht mal Punkte über die drei Dimensionen zum Gesamtnutzwert. "
             "Der Beitrag einer Dimension ist das Produkt aus Gewicht und normalisiertem Wert.",
             "Das Ergebnis ist eine Bewertung unter den Annahmen des Falls, keine Gewissheit. Wie stabil es ist, "
             "zeigen die nächsten beiden Stationen.")),
    Station("Sensitivität", "Abschnitte 4.5.2 und 4.5.3, Abbildungen 4 und 5",
            ("Der Tornado setzt jede Eingabe mit Spanne allein auf ihre Unter- und Obergrenze und zeigt, wie sich "
             "der Abstand der ersten beiden Alternativen ändert.",
             "Der Verlauf über dem technischen Gewicht zeigt Kipppunkte: Werte, an denen zwei Alternativen ihre "
             "Reihenfolge tauschen. Weitere Größen, die Kipppunkt-Karte und das Gewichtsdreieck stehen unter "
             "„Sensitivität“.")),
    Station("Einflussfaktoren und Szenarien", "Abschnitte 4.5.3 und 4.5.4, Formeln (11) bis (13), Tabelle 20",
            ("Verzug und Ausschussrisiko sind Faktorbausteine der Methode. Formel (11) bewertet eine verspätete "
             "Wiederbereitstellung mit Vertragsstrafe und Stillstand, die Formeln (12) und (13) den Fall, dass die "
             "Wiederaufbereitung scheitert und ein Neuteil beschafft werden muss.",
             "Einflussfaktoren setzen die Felder dahinter, Szenarien kombinieren sie. Der Vergleich zeigt, in "
             "welchen Szenarien eine andere Alternative vorn liegt."),
            ("Einflussfaktoren",)),
)

ANZAHL = len(STATIONEN)

# Die vier Verarbeitungsstufen (Abschnitt 4.1, Abbildung 3)
STUFEN: tuple[tuple[str, str], ...] = (
    ("1 Gate", "Eignungsprüfung des Bauteils, Ersatzbedarf, Verfügbarkeit des Neuteils"),
    ("2 Eingang und Dimensionen", "Schadensbild, Capability-Matching, technische, ökonomische und ökologische Bewertung"),
    ("3 Aggregation", "Normalisierung, Gewichtung, Gesamtnutzwert je Alternative"),
    ("4 Sensitivität und What-if", "Tornado, Kipppunkte, Szenarien, Rückkopplung auf die Aggregation"),
)


def schaubild(farbe_rahmen: str, farbe_flaeche: str, farbe_text: str, farbe_gedaempft: str, farbe_akzent: str) -> str:
    """SVG der vier Verarbeitungsstufen mit Rückkopplung von Stufe 4 auf Stufe 3."""
    breite, hoehe, box_b, box_h, abstand, oben = 1140, 260, 250, 132, 40, 30
    teile = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {breite} {hoehe}" width="100%" role="img" '
             f'aria-labelledby="stufen-titel stufen-text" font-family="IBM Plex Sans, Arial, sans-serif">',
             '<title id="stufen-titel">Architektur des KPI-Systems mit vier Verarbeitungsstufen</title>',
             '<desc id="stufen-text">' + escape(". ".join(f"{t}: {d}" for t, d in STUFEN)) +
             ". Stufe 4 wirkt als Rückkopplung auf Stufe 3.</desc>",
             '<defs><marker id="pfeil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" '
             f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{farbe_gedaempft}"/></marker></defs>']
    for i, (titel, text) in enumerate(STUFEN):
        x = 10 + i * (box_b + abstand)
        teile.append(f'<rect x="{x}" y="{oben}" width="{box_b}" height="{box_h}" rx="6" fill="{farbe_flaeche}" '
                     f'stroke="{farbe_akzent if i == 3 else farbe_rahmen}" stroke-width="{2 if i == 3 else 1.5}"/>')
        teile.append(f'<text x="{x + 14}" y="{oben + 30}" font-size="17" font-weight="600" fill="{farbe_text}">'
                     f'{escape(titel)}</text>')
        zeilen, zeile = [], ""
        for wort in text.split():
            if len(zeile) + len(wort) > 30:
                zeilen.append(zeile)
                zeile = wort
            else:
                zeile = f"{zeile} {wort}".strip()
        zeilen.append(zeile)
        for k, z in enumerate(zeilen):
            teile.append(f'<text x="{x + 14}" y="{oben + 56 + 20 * k}" font-size="14" fill="{farbe_gedaempft}">'
                         f'{escape(z)}</text>')
        if i < len(STUFEN) - 1:
            teile.append(f'<line x1="{x + box_b + 4}" y1="{oben + box_h / 2}" x2="{x + box_b + abstand - 4}" '
                         f'y2="{oben + box_h / 2}" stroke="{farbe_gedaempft}" stroke-width="2" marker-end="url(#pfeil)"/>')
    x3, x4 = 10 + 2 * (box_b + abstand) + box_b / 2, 10 + 3 * (box_b + abstand) + box_b / 2
    unten = oben + box_h
    teile.append(f'<path d="M{x4},{unten + 4} V{unten + 50} H{x3} V{unten + 8}" fill="none" stroke="{farbe_akzent}" '
                 f'stroke-width="2" stroke-dasharray="6 4" marker-end="url(#pfeil)"/>')
    teile.append(f'<text x="{(x3 + x4) / 2}" y="{unten + 72}" font-size="14" text-anchor="middle" '
                 f'fill="{farbe_text}">Rückkopplung: Eingaben und Gewichte variieren, erneut aggregieren</text>')
    teile.append("</svg>")
    return "".join(teile)


ALT_SCHAUBILD = ("Schaubild der vier Verarbeitungsstufen: " + "; ".join(f"{t}: {d}" for t, d in STUFEN)
                 + ". Stufe 4 wirkt als Rückkopplung auf Stufe 3.")


def schaubild_img(svg: str) -> str:
    """SVG als Bild mit Alternativtext. st.html filtert SVG-Elemente heraus, ein <img> mit data-URL bleibt erhalten."""
    import base64
    daten = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return (f'<img src="data:image/svg+xml;base64,{daten}" alt="{escape(ALT_SCHAUBILD)}" '
            f'style="width:100%;max-width:1140px;height:auto">')
