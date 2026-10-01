"""Faktorbausteine für externe Einflüsse (Abschnitt 4.5). Im Basisfall neutral.

Verzug: K_V = min(max(0, t_a − t_F) · (s_VS + s_St), Obergrenze der Strafe + Stillstand)
Ausschussrisiko: Mit der Wahrscheinlichkeit p scheitert die Wiederaufbereitung, dann folgen
zusätzlich Kosten und Emissionen des Neuteils sowie dessen Lieferzeit.
"""


def verzug(v: dict[str, float], t_a: float) -> float:
    tage = max(0.0, t_a - v["frist"])
    strafe = min(tage * v["strafe_tag"], v["strafe_max"])
    return strafe + tage * v["stillstand_tag"]


def lieferzeit(v: dict[str, float], alternative: str) -> float:
    return v.get(f"lieferzeit_{alternative}", 0.0)
