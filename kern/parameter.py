"""Eingangsgrößen des KPI-Systems mit Herkunft, Quelle und Spanne.

Herkunft: L = Literatur, amtliche Statistik oder Norm; A = Annahme; N = Nutzerangabe.
Jeder Wert des Referenzfalls entspricht einer Zeile der Tabellen 6, 11 oder 13.
Liegt in der Quelle nur eine Spanne vor, wird ihre Mitte angesetzt und die Grenzen
gehen als Spanne in die Sensitivitätsanalyse (Abschnitt 4.5).
"""
from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field, replace

ALTERNATIVEN = ("intern", "extern", "neuteil", "ausscheiden")

NAMEN = {
    "intern": "Interne Wiederaufbereitung",
    "extern": "Externe Wiederaufbereitung",
    "neuteil": "Neuteilersatz",
    "ausscheiden": "Ausscheiden",
}


@dataclass(frozen=True)
class Param:
    wert: float
    einheit: str
    herkunft: str  # "L", "A" oder "N"
    quelle: str
    spanne: tuple[float, float] | None = None
    text: str = ""


@dataclass
class Fall:
    """Bauteil, Schaden und betriebliche Ausgangslage (Tabellen 6, 7 und 9)."""

    bauteil: str = "Kurbelwelle, Sechszylinder-Nutzfahrzeugdieselmotor"
    werkstoff: str = "42CrMo4"
    werkstoffklasse: str = "Baustahl und niedriglegierte Stähle"
    schadenstyp: str = "Verschleiß"
    schadensgrad: str = "mittel"
    bauteil_aufbereitbar: bool = True     # vorgelagerte Eignungsprüfung, 4.1.4
    ersatzbedarf: bool = True             # 4.2.4
    neuteil_verfuegbar: bool = True       # 4.2.4
    # Technologieverfügbarkeit nach Tabelle 8: 5 intern qualifiziert, 4 intern nicht
    # qualifiziert, 3 etablierter Dienstleister, 2 nicht etablierter, 1 nicht verfügbar
    tv_intern: int = 5
    tv_extern: int = 3
    pf_intern: int = 4                    # Prozessfähigkeit, Tabelle 8
    pf_extern: int = 4
    # Faktorbaustein W4, Abschnitt 4.5: Ist die Frist hart, scheidet jede Alternative aus,
    # deren Lieferzeit die Frist überschreitet. Sonst wirkt der Verzug nur über die Kosten.
    harte_frist: bool = False
    # Konvention aus 4.3.1: Neuteil und Ausscheiden erhalten den Höchstwert 5. Abschnitt 4.5.4 prüft
    # die Konvention, indem dieser Wert versuchsweise auf die unterste Stufe gesetzt wird.
    s_tech_ohne_verfahren: float = 5.0
    # Hinterlegungstabelle der Werkstoffeignung (Tabelle 5) für diesen Fall, Zeilen je Schadenstyp,
    # Spalten in der Reihenfolge von matching.WERKSTOFFKLASSEN. None: Standardtabelle (Zusage aus 4.2.3).
    eignungstabelle: dict[str, list[int]] | None = None


def referenzparameter() -> dict[str, Param]:
    p: dict[str, Param] = {}

    # Bauteil und Auftrag (Tabelle 6)
    p["masse"] = Param(103.0, "kg", "L", "Zheng et al. (2019, S. 216 und S. 218)")
    p["auftrag"] = Param(1.0, "kg", "A", "eigene Annahme, Vergleichswert Zheng et al. (2019, S. 214)",
                         (0.5, 3.1))

    # Ökonomische Dimension (Tabelle 11)
    p["lohn"] = Param(48.30, "€/h", "L", "Statistisches Bundesamt, PM 154 vom 30.04.2025")
    p["strompreis"] = Param(0.227, "€/kWh", "L", "Eurostat nrg_pc_205, Band 500 bis 2.000 MWh, 2025")
    p["msr_auftrag"] = Param(12.0, "€/h", "L", "Kokare et al. (2023, Tab. 9)")
    p["msr_zerspanung"] = Param(16.0, "€/h", "L", "Kokare et al. (2023, Tab. 9)")
    p["drahtpreis"] = Param(10.37, "€/kg", "L",
                            "Williams et al. (2016, S. 643), Mitte von 2 bis 15 £/kg, EZB-Kurs 2016",
                            (1.2, 18.30), "Untergrenze Priarone et al. (2020, Tab. 6)")
    p["gaspreis"] = Param(2.30, "€/m³", "L", "Kokare et al. (2023, Tab. 9)")
    p["abscheiderate"] = Param(0.94, "kg/h", "L", "Priarone et al. (2020, S. 39)", (0.94, 3.0),
                               "Obergrenze Richtwert Williams et al. (2016)")
    p["mrr_schruppen"] = Param(11.3, "kg/h", "L", "Priarone et al. (2020, S. 39), Mitte von 9,4 bis 13,2",
                               (9.4, 13.2))
    p["mrr_schlichten"] = Param(1.6, "kg/h", "L", "Priarone et al. (2020, S. 39), Mitte von 1,3 bis 1,9",
                                (1.3, 1.9))
    p["gk_satz"] = Param(18.2, "€/h", "L", "Priarone et al. (2020, S. 39), Mitte von 12,7 bis 23,7",
                         (12.7, 23.7), "je Maschinenstunde")
    p["schrotterloes"] = Param(0.358, "€/kg", "L", "Statistisches Bundesamt, GENESIS 51000-0005, WP 7204, 2025")
    p["neuteilpreis_kg"] = Param(11.45, "€/kg", "L", "Eurostat DS-059358, Prodcom 28152230, DE 2024",
                                 (5.41, 16.94), "Einfuhrwert bis Obergrenze mit Handelsspanne")
    p["aufschlag"] = Param(0.06, "—", "L", "Deutsche Bundesbank (2026, S. 97), Median 5,7 % vom Umsatz",
                           (0.021, 0.15), "Obergrenze Gudehus (2010, S. 1003)")
    # Frachtpreis Stückgut nach Gudehus (2010, S. 967, Tab. 20.2), Preisbasis 2004
    p["fracht_sendung"] = Param(7.20, "€/Sendung", "L", "Gudehus (2010, S. 967, Tab. 20.2)")
    p["fracht_palette"] = Param(19.00, "€/Palette", "L", "Gudehus (2010, S. 967, Tab. 20.2)")
    p["fracht_km"] = Param(0.075, "€/(Palette·km)", "L", "Gudehus (2010, S. 967, Tab. 20.2)")
    p["frachtindex"] = Param(1.452, "—", "L", "Eurostat sts_sepp_a, H494, 2006 bis 2023")
    p["entfernung"] = Param(150.0, "km", "A", "eigene Annahme, je Richtung", (50.0, 500.0))
    p["losgroesse"] = Param(1.0, "Stück", "A", "taktische Einzelfallentscheidung (4.1.1)", (1.0, 84.0),
                            "Obergrenze Abu et al. (2017)")
    p["teile_je_palette"] = Param(1.0, "Stück", "A", "eigene Annahme")
    p["t_reinigung"] = Param(0.25, "h", "A", "eigene Annahme", (0.1, 1.0))
    p["t_pruefung"] = Param(0.5, "h", "A", "eigene Annahme, Sicht-, Maß- und Rissprüfung", (0.25, 1.5))
    p["t_fremdvergabe"] = Param(0.5, "h", "A", "eigene Annahme, Beauftragung und Abnahme", (0.25, 2.0))
    p["anteil_endbearbeitung"] = Param(1.0, "—", "A", "Obergrenze nach 4.3.2, gesamter Auftrag", (0.2, 1.0))

    # Ökologische Dimension (Tabelle 13)
    p["e_draht"] = Param(3.0, "kg CO₂-Äq/kg", "L", "ESAB (2025, S. 9)")
    p["w_auftrag"] = Param(23.7 / 3.6, "kWh/kg", "L", "Priarone et al. (2020, S. 39)", (0.522, 23.7 / 3.6),
                           "Untergrenze Zulfi (2025, S. 9), EPD für MIG/WIG-Massivdrähte, Szenariowert")
    p["gasmenge"] = Param(14.0, "l/min", "L", "Mehmert (2003, S. 22)")
    p["dichte_argon"] = Param(1.784, "kg/m³", "L", "Stoffwert Argon, Normzustand")
    p["e_argon"] = Param(0.045, "kg CO₂-Äq/kg", "L", "ProBAS, Argon-DE-2020 (GEMIS)")
    p["e_schruppen"] = Param(0.06, "kg CO₂/kg", "L", "Priarone et al. (2020, S. 39)")
    p["e_schlichten"] = Param(0.27, "kg CO₂/kg", "L", "Priarone et al. (2020, S. 39)")
    p["w_reinigung"] = Param(0.995, "kWh/m²", "L", "Peng et al. (2015, S. 813)")
    p["flaeche_reinigung"] = Param(1.0, "m²", "A", "eigene Annahme", (0.5, 2.0))
    p["f_strom"] = Param(0.414, "kg CO₂-Äq/kWh", "L", "Icha und Lauf (2026, S. 16), 2024 vorläufig")
    p["e_stahl"] = Param(2.1822, "kg CO₂-Äq/kg", "L", "ProBAS, Konverterstahl, 2013 (ILCD)", (0.5508, 2.1822),
                         "Untergrenze Elektrostahl")
    p["e_warm"] = Param(0.20748, "kg CO₂-Äq/kg", "L", "ProBAS, Warmwalzen, 1997 (ILCD)", (0.20748, 1.55),
                        "Obergrenze Schmieden nach Priarone et al. (2020, S. 39)")
    p["e_schrott"] = Param(0.03421, "kg CO₂-Äq/kg", "L", "ProBAS, Eisenschrott, 2012 (ILCD)")
    p["e_lkw"] = Param(0.0859, "kg CO₂-Äq/tkm", "L", "ProBAS, Lkw-Diesel-DE-2020 (GEMIS)", (0.047, 0.0859))
    p["ausnutzung"] = Param(1.3, "—", "A", "eigene Annahme", (1.1, 1.6))
    # Szenario vermiedene Last (4.5): Der Schrott des Altteils ersetzt Primärstahl. Gutschrift je kg
    # Schrott = Konverterstahl minus Elektrostahl nach ProBAS, 2,1822 − 0,5508 = 1,6314. Basisfall Cut-off.
    # Variante 4.3.3: Schleifen, Wärmebehandlung, thermische Vorbehandlung als Zuschlag je wiederaufbereitetem
    # Bauteil. Basisfall ohne Zuschlag.
    p["zusatz_co2_aufbereitung"] = Param(0.0, "kg CO₂-Äq", "A", "Basisfall ohne Zusatzpositionen (4.3.3)")
    p["gutschrift_schrott"] = Param(0.0, "kg CO₂-Äq/kg", "A", "Cut-off, keine Gutschrift (4.3.3)")

    # Faktorbausteine (Abschnitt 4.5), im Basisfall neutral
    for a in ("intern", "extern", "neuteil"):
        p[f"lieferzeit_{a}"] = Param(0.0, "Arbeitstage", "A", "Faktorbaustein Verzug, neutral")
    p["frist"] = Param(0.0, "Arbeitstage", "A", "Faktorbaustein Verzug, neutral")
    p["strafe_tag"] = Param(0.0, "€/Arbeitstag", "A", "Faktorbaustein Verzug, neutral")
    p["stillstand_tag"] = Param(0.0, "€/Arbeitstag", "A", "Faktorbaustein Verzug, neutral")
    p["strafe_max"] = Param(float("inf"), "€", "A", "Obergrenze der Vertragsstrafe, keine")
    p["ausschuss"] = Param(0.0, "—", "A", "Faktorbaustein Ausschussrisiko, neutral", (0.0, 0.5),
                           "Aufbereitbarkeitsquote 50 bis 90 % nach Sutherland et al. (2008, S. 7)")
    return p


@dataclass
class Gewichte:
    """Gewichte der vier technischen Unterkriterien und der drei Dimensionen (4.4.2)."""

    technologie: float = 0.25
    prozess: float = 0.25
    schadensgrad: float = 0.25
    werkstoff: float = 0.25
    tech: float = 1 / 3
    oekon: float = 1 / 3
    oekol: float = 1 / 3

    def pruefen(self) -> None:
        u = self.technologie + self.prozess + self.schadensgrad + self.werkstoff
        d = self.tech + self.oekon + self.oekol
        if abs(u - 1) > 1e-9 or abs(d - 1) > 1e-9:
            raise ValueError(f"Gewichte summieren nicht zu 1 (Unterkriterien {u:.4f}, Dimensionen {d:.4f})")
        if min(self.technologie, self.prozess, self.schadensgrad, self.werkstoff,
               self.tech, self.oekon, self.oekol) < 0:
            raise ValueError("Gewichte dürfen nicht negativ sein")

    def mit_dimensionsgewicht(self, dimension: str, w: float) -> "Gewichte":
        """Setzt ein Dimensionsgewicht und verteilt den Rest im bisherigen Verhältnis."""
        dims = ("tech", "oekon", "oekol")
        rest_alt = sum(getattr(self, d) for d in dims if d != dimension)
        neu = {d: (1 - w) * getattr(self, d) / rest_alt for d in dims if d != dimension}
        neu[dimension] = w
        return replace(self, **neu)


def mit(params: dict[str, Param], **werte: float) -> dict[str, Param]:
    """Kopie der Parameter mit geänderten Werten, Herkunft bleibt erhalten."""
    neu = deepcopy(params)
    for k, v in werte.items():
        if k not in neu:
            raise KeyError(f"Unbekannter Parameter: {k}")
        neu[k] = replace(neu[k], wert=float(v))
    return neu


def werte(params: dict[str, Param]) -> dict[str, float]:
    return {k: v.wert for k, v in params.items()}
