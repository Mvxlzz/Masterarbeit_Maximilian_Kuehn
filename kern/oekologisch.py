"""Ökologische Dimension nach Abschnitt 4.3.3, Formel (8), Positionen nach Tabelle 12.

Alle Werte in kg CO₂-Äquivalent je Bauteil. Recycling nach dem Cut-off-Ansatz.
"""
from .oekonomisch import zeiten


def aufbereitung(v: dict[str, float]) -> dict[str, float]:
    t_auf = zeiten(v)["auftrag"]
    argon_kg = v["gasmenge"] * t_auf * 60 / 1000 * v["dichte_argon"]
    abtrag_vor = v["auftrag"]
    abtrag_end = v["auftrag"] * v["anteil_endbearbeitung"]
    return {
        "Zusatzwerkstoff": v["auftrag"] * v["e_draht"],
        "Strom für den Materialauftrag": v["auftrag"] * v["w_auftrag"] * v["f_strom"],
        "Schutzgas": argon_kg * v["e_argon"],
        "Spanende Vor- und Endbearbeitung": abtrag_vor * v["e_schruppen"] + abtrag_end * v["e_schlichten"],
        "Reinigung des Altteils": v["flaeche_reinigung"] * v["w_reinigung"] * v["f_strom"],
        **({"Zusatzpositionen (Variante 4.3.3)": v["zusatz_co2_aufbereitung"]}
           if v["zusatz_co2_aufbereitung"] else {}),
    }


def transport(v: dict[str, float], fahrten: int) -> float:
    return v["masse"] / 1000 * fahrten * v["entfernung"] * v["e_lkw"]


def emissionen(alternative: str, v: dict[str, float]) -> dict[str, float]:
    entsorgung = v["masse"] * v["e_schrott"]
    gutschrift = ({"Gutschrift Schrott des Altteils": -v["masse"] * v["gutschrift_schrott"]}
                  if v["gutschrift_schrott"] else {})
    if alternative == "intern":
        return aufbereitung(v)
    if alternative == "extern":
        return {**aufbereitung(v), "Transport": transport(v, 2)}
    if alternative == "neuteil":
        rohteil = v["masse"] * v["ausnutzung"]
        return {
            "Stahlerzeugung für das Rohteil": rohteil * v["e_stahl"],
            "Warmumformung": rohteil * v["e_warm"],
            "Zerspanung des Rohteils": (rohteil - v["masse"]) * v["e_schruppen"],
            "Transport": transport(v, 1),
            "Entsorgung des Altteils": entsorgung,
            **gutschrift,
        }
    if alternative == "ausscheiden":
        return {"Entsorgung des Altteils": entsorgung, **gutschrift}
    raise ValueError(alternative)
