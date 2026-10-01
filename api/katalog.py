"""Anzeigetexte ohne Zahlen: Herkunft und Bewertungsraster der technischen Dimension (Tabelle 8).

Felder, Einheiten, Quellen und Spannen stehen im Fallmodell (kern.modell), Anzeigenamen der
Alternativen ebenfalls.
"""
from __future__ import annotations

HERKUNFT = {"L": "Literatur", "A": "Annahme", "N": "Nutzerangabe"}

# Tabelle 8: Bewertungsskala der technischen Dimension, Stufe 5 (höchste) bis 1 (niedrigste).
# Stufe 1 in einem Unterkriterium ist das technische Ausschlusskriterium.
RASTER_TITEL = {
    "technologie": "Technologieverfügbarkeit",
    "prozess": "Prozessfähigkeit und Qualität",
    "schadensgrad": "Beherrschbarkeit des Schadensgrads",
    "werkstoff": "Werkstoffeignung",
}
RASTER = {
    "technologie": {
        5: "Verfahren intern vorhanden und für Werkstoff-Schadenkombination qualifiziert",
        4: "Verfahren intern vorhanden jedoch nicht für Werkstoff-Schadenkombination qualifiziert",
        3: "Verfahren nur über einen extern etablierten Dienstleister verfügbar",
        2: "Verfahren nur über einen externen nicht etablierten Dienstleister verfügbar",
        1: "Verfahren weder intern noch extern verfügbar",
    },
    "prozess": {
        5: "Wiederaufbereitung auf das Niveau des Grundwerkstoffs und vollständige Endbearbeitung",
        4: "Metallurgische Bindung bei voller Tragfähigkeit bei standardmäßiger Endbearbeitung",
        3: "Mechanische Bindung auf hohem Niveau",
        2: "Mechanische Bindung auf begrenztem Niveau",
        1: "Wiederaufbereitung kann Eigenschaftsniveau nicht erreichen",
    },
    "schadensgrad": {
        5: "Nicht besetzt",
        4: "Schadensgrad niedrig",
        3: "Schadensgrad mittel",
        2: "Schadensgrad hoch",
        1: "Schaden außerhalb der Beherrschbarkeit",
    },
    "werkstoff": {
        5: "Sehr gut geeignet",
        4: "Gut geeignet",
        3: "Mäßig geeignet",
        2: "Gering geeignet",
        1: "Nicht geeignet",
    },
}

# Einflussfaktoren und Szenarien (PRD, Abschnitt 7)
FAKTORTYP = {"wertaenderung": "Wertänderung", "zuschlag": "Zuschlag", "einstellung": "Einstellung"}
FAKTORTYP_HILFE = {
    "wertaenderung": "setzt oder skaliert Felder, z. B. Lieferzeiten, Strafe, Ausschussrisiko, Emissionsfaktor",
    "zuschlag": "fügt Kosten- oder CO₂-Positionen mit eigener Formel hinzu",
    "einstellung": "ändert Gate, harte Frist oder die technische Konvention",
}
EINSTELLUNG = {
    "bauteil_aufbereitbar": "Bauteil wiederaufbereitbar (Gate)",
    "ersatzbedarf": "Ersatzbedarf besteht (Gate)",
    "neuteil_verfuegbar": "Neuteil verfügbar (Gate)",
    "harte_frist": "Frist als Ausschlusskriterium (harte Frist)",
    "s_tech_ohne_verfahren": "Technischer Dimensionswert ohne Verfahren (Konvention 4.3.1, Stufe 1 bis 5)",
}
# Faktorbausteine Verzug und Ausschussrisiko (Formeln 11 bis 13): Bezeichnung und Einheit
BAUSTEIN = {
    "frist": ("Frist", "Arbeitstage"),
    "lieferzeit": ("Lieferzeit", "Arbeitstage"),
    "strafe_tag": ("Vertragsstrafe je Arbeitstag", "€/Arbeitstag"),
    "strafe_max": ("Obergrenze der Vertragsstrafe", "€"),
    "stillstand_tag": ("Stillstandskosten je Arbeitstag", "€/Arbeitstag"),
    "ausschuss": ("Ausschussrisiko der Wiederaufbereitung", "—"),
}

# Standardbereich einer Größe für Verlauf und Kipppunkt-Karte, wenn das Feld keine Spanne hat
# (Suchbereiche aus REFERENZWERTE.md, Abschnitte 3 und 6)
BEREICH = {
    "strafe_tag": (0.0, 400.0), "stillstand_tag": (0.0, 400.0), "frist": (0.0, 30.0),
    "lieferzeit_intern": (5.0, 30.0), "lieferzeit_extern": (5.0, 30.0), "lieferzeit_neuteil": (0.0, 30.0),
    "strafe_max": (0.0, 10000.0), "ausschuss": (0.0, 1.0), "entfernung": (0.0, 5000.0),
}
