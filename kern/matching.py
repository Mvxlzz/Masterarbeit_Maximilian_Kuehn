"""Schadensgrad-Mapping (Tabelle 3) und Capability-Matching (Tabelle 5).

Beide Tabellen sind als Hinterlegungstabellen ausgeführt. Ein Betrieb kann sie ersetzen,
ohne den Bewertungsalgorithmus zu ändern (Zusage aus Abschnitt 4.2.3).
"""

SCHADENSGRAD_SCORE = {"niedrig": 4, "mittel": 3, "hoch": 2, "kritisch": 1}

SCHADENSTYPEN = ("Verschleiß", "Korrosion", "Maßabweichung", "Bruch und Riss")

WERKSTOFFKLASSEN = (
    "Baustahl und niedriglegierte Stähle",
    "Hochlegierte Stähle und Werkzeugstähle",
    "Gusseisen",
    "Aluminiumlegierungen",
    "Titan- und Nickelbasislegierungen",
)

VERFAHRENSKLASSE = {
    "Verschleiß": "Materialauftrag, schmelzbasiert oder gespritzt, plus spanende Bearbeitung",
    "Korrosion": "Spritzverfahren, bei größerer Tiefe schmelzbasiert, plus spanende Bearbeitung",
    "Maßabweichung": "Richten und/oder spanende Bearbeitung, kein Materialauftrag",
    "Bruch und Riss": "nur schmelzbasiert, plus Wärmebehandlung und zerstörungsfreie Prüfung",
}

# Tabelle 5, Zeilen Schadenstyp, Spalten Werkstoffklasse in der Reihenfolge oben
EIGNUNG = {
    "Verschleiß": (4, 3, 2, 4, 3),
    "Korrosion": (4, 4, 4, 4, 4),
    "Maßabweichung": (5, 3, 2, 5, 3),
    "Bruch und Riss": (2, 2, 1, 2, 2),
}


def werkstoffeignung(schadenstyp: str, werkstoffklasse: str, tabelle: dict | None = None) -> int:
    tab = tabelle or EIGNUNG
    return tab[schadenstyp][WERKSTOFFKLASSEN.index(werkstoffklasse)]


def schadensgrad_score(schadensgrad: str) -> int:
    return SCHADENSGRAD_SCORE[schadensgrad]
