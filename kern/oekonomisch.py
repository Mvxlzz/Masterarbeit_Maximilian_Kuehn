"""Ökonomische Dimension nach Abschnitt 4.3.2, Positionen nach Tabelle 10.

Alle Beträge in Euro je Bauteil. Die Losgröße wirkt über die Sendungskosten des Transports.
"""
import math


def fracht_je_teil(v: dict[str, float]) -> float:
    """Stückgutfracht je Teil und Richtung nach der Masterformel von Gudehus (2010, S. 967),
    fortgeschrieben mit dem Erzeugerpreisindex (Faktor 2006 bis 2023)."""
    n = v["losgroesse"]
    paletten = math.ceil(n / v["teile_je_palette"])
    sendung = v["fracht_sendung"] + paletten * (v["fracht_palette"] + v["entfernung"] * v["fracht_km"])
    return sendung * v["frachtindex"] / n


def zeiten(v: dict[str, float]) -> dict[str, float]:
    """Bearbeitungszeiten der Wiederaufbereitung in Stunden je Teil."""
    return {
        "reinigung": v["t_reinigung"],
        "vorbereitung": v["auftrag"] / v["mrr_schruppen"],
        "auftrag": v["auftrag"] / v["abscheiderate"],
        "endbearbeitung": v["auftrag"] * v["anteil_endbearbeitung"] / v["mrr_schlichten"],
        "pruefung": v["t_pruefung"],
    }


def aufbereitung(v: dict[str, float]) -> dict[str, float]:
    """Herstellkosten der Wiederaufbereitung, gleich für den eigenen Betrieb und den Dienstleister."""
    t = zeiten(v)
    t_zerspanen = t["vorbereitung"] + t["endbearbeitung"]
    t_maschine = t_zerspanen + t["auftrag"]
    gas_m3 = v["gasmenge"] * t["auftrag"] * 60 / 1000
    strom_kwh = v["auftrag"] * v["w_auftrag"] + v["flaeche_reinigung"] * v["w_reinigung"]
    return {
        "Reinigung": t["reinigung"] * v["lohn"],
        "Spanende Vorbereitung": t["vorbereitung"] * (v["lohn"] + v["msr_zerspanung"]),
        "Materialauftrag, Arbeit und Anlage": t["auftrag"] * (v["lohn"] + v["msr_auftrag"]),
        "Zusatzwerkstoff": v["auftrag"] * v["drahtpreis"],
        "Schutzgas": gas_m3 * v["gaspreis"],
        "Strom": strom_kwh * v["strompreis"],
        "Spanende Endbearbeitung": t["endbearbeitung"] * (v["lohn"] + v["msr_zerspanung"]),
        "Prüfung": t["pruefung"] * v["lohn"],
        "Gemeinkosten": t_maschine * v["gk_satz"],
    }


def kosten(alternative: str, v: dict[str, float]) -> dict[str, float]:
    schrott = -v["masse"] * v["schrotterloes"]
    if alternative == "intern":
        return aufbereitung(v)
    if alternative == "extern":
        herstell = sum(aufbereitung(v).values())
        return {
            "Entgelt des Dienstleisters": herstell * (1 + v["aufschlag"]),
            "Transport hin und zurück": 2 * fracht_je_teil(v),
            "Beauftragung und Abnahme": v["t_fremdvergabe"] * v["lohn"],
        }
    if alternative == "neuteil":
        return {
            "Einstandspreis": v["masse"] * v["neuteilpreis_kg"],
            "Anliefertransport": fracht_je_teil(v),
            "Schrotterlös Altteil": schrott,
        }
    if alternative == "ausscheiden":
        return {"Schrotterlös Altteil": schrott}
    raise ValueError(alternative)
