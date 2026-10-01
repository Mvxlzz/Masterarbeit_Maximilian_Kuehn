"""Formeln der Methode, Darstellung der Rechenweg-Schritte und Glossar (Wortlaut aus Kapitel 4).

Nur Text und LaTeX, keine Zahlen des Falls und keine Rechnung. Die Zahlen liefert
`kern.modell.bewerte_modell` im Rechenweg (`ModellErgebnis.rechenweg`). Konstanten der Formeln selbst
(1, 4, 100) sind Teil des Wortlauts.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Formel:
    nummer: str      # "(9)" wie in der Arbeit, "" für Formeln ohne Nummer
    titel: str
    abschnitt: str   # Abschnitt der Arbeit
    latex: str
    zeichen: tuple[tuple[str, str], ...]  # (Formelzeichen in LaTeX ohne $, Erklärung), Wortlaut nach Kapitel 4
    hinweis: str = ""                     # ergänzender Satz unter der Liste

    @property
    def text(self) -> str:
        """Erläuterung als Markdown: je Formelzeichen eine Zeile „Zeichen: Erklärung“, darunter der Hinweis."""
        liste = "\n".join(f"- ${z}$: {e}" for z, e in self.zeichen)
        return liste + (f"\n\n{self.hinweis}" if self.hinweis else "")


# ---------------------------------------------------------------- Formeln der Methode (Kapitel 4)

METHODE: list[Formel] = [
    Formel("(5)", "Dimensionswert der technischen Dimension", "4.3.1",
           r"s_{\text{tech}} = \sum_{i=1}^{4} w_i \cdot s_i, \quad \text{mit} \sum_{i=1}^{4} w_i = 1",
           ((r"s_{\text{tech}}", "Dimensionswert der technischen Dimension"),
            (r"s_i", r"Bewertung des $i$-ten Unterkriteriums auf der fünfstufigen Skala nach Tabelle 8"),
            (r"w_i", r"Gewicht des $i$-ten Unterkriteriums")),
           "Die Gewichte summieren sich zu eins, sodass der Dimensionswert denselben Wertebereich von eins bis fünf "
           "behält wie die Einzelbewertungen."),
    Formel("(6)", "Punkte der technischen Dimension", "4.3.1",
           r"n_{\text{tech}} = \frac{s_{\text{tech}} - 1}{4} \cdot 100",
           ((r"n_{\text{tech}}", "auf die Skala von null bis hundert überführter Wert der technischen Dimension"),
            (r"s_{\text{tech}}", "Dimensionswert aus Formel (5)")),
           "Der Subtrahend eins verschiebt den Skalenanfang von eins auf null, der Divisor vier ist die Spannweite "
           "der fünfstufigen Skala, der Faktor hundert dehnt das Ergebnis auf die Punkteskala. Die Umrechnung ist "
           "absolut (globale Skala)."),
    Formel("(8)", "Treibhauspotenzial einer Alternative", "4.3.3",
           r"E_a = \sum_k m_{a,k} \cdot e_k + W_a \cdot f_{\text{Strom}} + m_B \cdot d_a \cdot e_T",
           ((r"E_a", r"Treibhauspotenzial der Alternative $a$ in kg CO₂-Äq je funktioneller Einheit"),
            (r"m_{a,k}", r"eingesetzte, abgetragene oder entsorgte Masse der Position $k$ in kg"),
            (r"e_k", "charakterisierter Emissionsfaktor der Position in kg CO₂-Äq je kg"),
            (r"W_a", "Strombedarf der Prozesse in kWh"),
            (r"f_{\text{Strom}}", "Emissionsfaktor des deutschen Strommixes"),
            (r"m_B", "Bauteilmasse in t"),
            (r"d_a", "gesamte Transportentfernung in km"),
            (r"e_T", "Emissionsfaktor des Lkw-Transports in kg CO₂-Äq je tkm")),
           r"Im Werkzeug ist jede Position eine eigene Formel, $E_a$ ist ihre Summe."),
    Formel("(9)", "Min-Max-Normalisierung der ökonomischen und ökologischen Dimension", "4.4.1",
           r"n_{a,d} = \frac{x_{\max,d} - x_{a,d}}{x_{\max,d} - x_{\min,d}} \cdot 100",
           ((r"n_{a,d}", r"normalisierter Wert der Alternative $a$ in der Dimension $d$ auf der Skala von null bis "
                         "hundert"),
            (r"x_{a,d}", "Rohwert der Alternative in Euro oder kg CO₂-Äq"),
            (r"x_{\max,d}", "höchster Rohwert aller zulässigen Alternativen in dieser Dimension"),
            (r"x_{\min,d}", "niedrigster Rohwert aller zulässigen Alternativen in dieser Dimension")),
           "Die Skala ist lokal, sie hängt von den verglichenen Alternativen ab. Stimmen alle Rohwerte überein, "
           "erhalten alle Alternativen hundert Punkte."),
    Formel("(10)", "Gesamtnutzwert (gewichtete Summe)", "4.4.3",
           r"S_a = w_{\text{tech}} \cdot n_{a,\text{tech}} + w_{\text{ökon}} \cdot n_{a,\text{ökon}} "
           r"+ w_{\text{ökol}} \cdot n_{a,\text{ökol}}, \quad \text{mit } w_{\text{tech}} + w_{\text{ökon}} "
           r"+ w_{\text{ökol}} = 1",
           ((r"S_a", r"Gesamtnutzwert der Alternative $a$ auf der Skala von null bis hundert"),
            (r"n_{a,\text{tech}}", "technischer Wert nach Formel (6)"),
            (r"n_{a,\text{ökon}},\ n_{a,\text{ökol}}", "normalisierte Werte nach Formel (9)"),
            (r"w_{\text{tech}},\ w_{\text{ökon}},\ w_{\text{ökol}}", "Gewichte der drei Dimensionen")),
           "Der Beitrag einer Dimension ist das Produkt aus Gewicht und normalisiertem Wert."),
    Formel("(11)", "Verzugskosten (Faktorbaustein Verzug)", "4.5.3",
           r"K_{V,a} = \min\left(\max(0,\, t_a - t_F) \cdot s_{VS},\ K_{VS,\max}\right) "
           r"+ \max(0,\, t_a - t_F) \cdot s_{St}",
           ((r"K_{V,a}", r"Verzugskosten der Alternative $a$ in Euro"),
            (r"t_a", "Zeit bis zur Wiederbereitstellung in Arbeitstagen"),
            (r"t_F", "vereinbarte Frist in Arbeitstagen"),
            (r"\max(0,\, t_a - t_F)", "Verspätung in Arbeitstagen"),
            (r"s_{VS}", "Vertragsstrafe je Arbeitstag"),
            (r"K_{VS,\max}", "Obergrenze der Vertragsstrafe"),
            (r"s_{St}", "Kostensatz für den Stillstand je Arbeitstag")),
           "Die Obergrenze gilt nur für die Vertragsstrafe."),
    Formel("(12)", "Erwartete Kosten mit Ausschussrisiko", "4.5.3",
           r"\tilde{K}_a = K_a + p_a \cdot K_{\text{Neu}} + (1 - p_a) \cdot K_{V,a}(t_a) "
           r"+ p_a \cdot K_{V,a}(t_a + t_{\text{Neu}})",
           ((r"\tilde{K}_a", r"erwartete Kosten der Wiederaufbereitungsalternative $a$"),
            (r"K_a", "Kosten ohne Ausschussrisiko"),
            (r"p_a", "Wahrscheinlichkeit, dass die Wiederaufbereitung scheitert"),
            (r"K_{\text{Neu}}", "Kosten des Neuteilersatzes"),
            (r"t_{\text{Neu}}", "Lieferzeit des Neuteils in Arbeitstagen"),
            (r"K_{V,a}(t)", r"Verzugskosten nach Formel (11) für eine Wiederbereitstellung nach $t$ Arbeitstagen"))),
    Formel("(13)", "Erwartetes Treibhauspotenzial mit Ausschussrisiko", "4.5.3",
           r"\tilde{E}_a = E_a + p_a \cdot E_{\text{Neu}}",
           ((r"\tilde{E}_a", r"erwartetes Treibhauspotenzial der Wiederaufbereitungsalternative $a$"),
            (r"E_a", "Treibhauspotenzial ohne Ausschussrisiko"),
            (r"E_{\text{Neu}}", "Treibhauspotenzial des Neuteilersatzes")),
           "Der Verzug wirkt nur über die Kosten, deshalb hat Formel (13) keinen entsprechenden Summanden."),
]

NACH_NUMMER = {f.nummer: f for f in METHODE}


# ---------------------------------------------------------------- Darstellung der Rechenweg-Schritte

@dataclass(frozen=True)
class Darstellung:
    """Wie ein Schritt aus dem Kern angezeigt wird. `eingesetzt` ist eine Vorlage, in der «name» durch den
    Wert aus Schritt.werte ersetzt wird («w_*» steht für den einzigen Namen mit diesem Anfang). Ohne
    Vorlage zeigt die Komponente die Summe der Werte (Σ-Formeln)."""
    links: str        # linke Seite der Formel in LaTeX
    latex: str        # rechte Seite in LaTeX
    nummer: str = ""
    abschnitt: str = ""
    eingesetzt: str | None = None


# Schlüssel ist Schritt.formel, wie kern/modell.py ihn schreibt
KERNFORMELN: dict[str, Darstellung] = {
    "Σ K_p": Darstellung("K_a", r"\sum_p K_{a,p}", "", "4.3.2"),
    "Σ E_p": Darstellung("E_a", r"\sum_p E_{a,p}", "(8)", "4.3.3"),
    "s = s_ohne_Verfahren (Konvention 4.3.1)": Darstellung(
        r"s_{\text{tech}}", r"s_{\text{ohne Verfahren}}", "", "4.3.1, Konvention", "«s_ohne_Verfahren»"),
    "Σ g_j · s_j": Darstellung(r"s_{\text{tech}}", r"\sum_i w_i \cdot s_i", "(5)", "4.3.1"),
    "(s − 1) / 4 · 100": Darstellung(r"n_{\text{tech}}", r"\frac{s_{\text{tech}} - 1}{4} \cdot 100", "(6)",
                                     "4.3.1", r"\frac{«s» - 1}{4} \cdot 100"),
    "(x_max − x) / (x_max − x_min) · 100": Darstellung(
        r"n_{a,d}", r"\frac{x_{\max,d} - x_{a,d}}{x_{\max,d} - x_{\min,d}} \cdot 100", "(9)", "4.4.1",
        r"\frac{«x_max» - «x»}{«x_max» - «x_min»} \cdot 100"),
    "w_d · n_d": Darstellung(r"b_{a,d}", r"w_d \cdot n_{a,d}", "(10)", "4.4.3, Beitrag einer Dimension",
                             r"«w_*» \cdot «n_*»"),
    "Σ w_d · n_d": Darstellung(
        "S_a", r"w_{\text{tech}} \cdot n_{a,\text{tech}} + w_{\text{ökon}} \cdot n_{a,\text{ökon}} + "
               r"w_{\text{ökol}} \cdot n_{a,\text{ökol}}", "(10)", "4.4.3",
        r"«w_tech» \cdot «n_tech» + «w_oekon» \cdot «n_oekon» + «w_oekol» \cdot «n_oekol»"),
    "(1 − p)·K_V(t_a) + p·K_V(t_a + t_R)": Darstellung(
        r"K_{V}", r"(1 - p_a) \cdot K_{V,a}(t_a) + p_a \cdot K_{V,a}(t_a + t_{\text{Neu}})", "(11), (12)", "4.5.3",
        r"(1 - «p») \cdot K_{V}(«t_a») + «p» \cdot K_{V}(«t_a» + «t_R»)"),
    "p · K_R": Darstellung(r"p_a \cdot K_{\text{Neu}}", r"p_a \cdot K_{\text{Neu}}", "(12)", "4.5.3",
                           r"«p» \cdot «K_R»"),
    "w_oekol / w_oekon · (K_max − K_min) / (E_max − E_min) · 1000": Darstellung(
        r"R_{\text{CO}_2}", r"\frac{w_{\text{ökol}}}{w_{\text{ökon}}} \cdot \frac{K_{\max} - K_{\min}}{E_{\max} - E_{\min}} "
                            r"\cdot 1000", "", "4.4.2",
        r"\frac{«w_oekol»}{«w_oekon»} \cdot \frac{«K_max» - «K_min»}{«E_max» - «E_min»} \cdot 1000"),
    "p · E_R": Darstellung(r"p_a \cdot E_{\text{Neu}}", r"p_a \cdot E_{\text{Neu}}", "(13)", "4.5.3",
                           r"«p» \cdot «E_R»"),
}

# Formeln der Anwender (Hilfsgrößen, Positionen): linke Seite je Bereich, Abschnitt der Arbeit
LINKS_POSITION = {"€": "K_{a,p}", "kg CO₂-Äq": "E_{a,p}"}
ABSCHNITT_POSITION = {"€": "4.3.2, Position der ökonomischen Dimension",
                      "kg CO₂-Äq": "4.3.3, Position der ökologischen Dimension, Formel (8)"}

# Namen in Schritt.werte, die weder Feld noch Hilfsgröße sind: Bezeichnung, Einheit, Herkunft
_ZWISCHEN = "Zwischenergebnis"
_GEWICHT = "Gewicht, Seite „Fall bearbeiten“ oder Szenario"
_BAUSTEIN = "Faktorbaustein, aus den Feldern der Gruppe Einflussfaktoren"
SYMBOLE: dict[str, tuple[str, str, str]] = {
    "x": ("Rohwert der Alternative", "", _ZWISCHEN),
    "x_min": ("niedrigster Rohwert der zulässigen Alternativen", "", _ZWISCHEN),
    "x_max": ("höchster Rohwert der zulässigen Alternativen", "", _ZWISCHEN),
    "s": ("technischer Dimensionswert, Formel (5)", "Skala 1 bis 5", _ZWISCHEN),
    "s_ohne_Verfahren": ("technischer Wert der Alternativen ohne Verfahren (Konvention 4.3.1)", "Skala 1 bis 5",
                         "Einstellung, Registerkarte Technik"),
    "w_tech": ("Gewicht der technischen Dimension", "Anteil", _GEWICHT),
    "w_oekon": ("Gewicht der ökonomischen Dimension", "Anteil", _GEWICHT),
    "w_oekol": ("Gewicht der ökologischen Dimension", "Anteil", _GEWICHT),
    "n_tech": ("Punkte technisch, Formel (6)", "Punkte", _ZWISCHEN),
    "n_oekon": ("Punkte ökonomisch, Formel (9)", "Punkte", _ZWISCHEN),
    "n_oekol": ("Punkte ökologisch, Formel (9)", "Punkte", _ZWISCHEN),
    "p": ("Wahrscheinlichkeit, dass die Wiederaufbereitung scheitert", "Anteil", _BAUSTEIN),
    "t_a": ("Zeit bis zur Wiederbereitstellung", "AT", _BAUSTEIN),
    "t_R": ("Lieferzeit der Rückfall-Alternative", "AT", _BAUSTEIN),
    "Frist": ("vereinbarte Frist", "AT", _BAUSTEIN),
    "Strafe je Arbeitstag": ("Vertragsstrafe je Arbeitstag", "€/AT", _BAUSTEIN),
    "Stillstand je Arbeitstag": ("Stillstandskosten je Arbeitstag", "€/AT", _BAUSTEIN),
    "K_max": ("höchste Kosten der zulässigen Alternativen", "€", _ZWISCHEN),
    "K_min": ("niedrigste Kosten der zulässigen Alternativen", "€", _ZWISCHEN),
    "E_max": ("höchstes Treibhauspotenzial der zulässigen Alternativen", "kg CO₂-Äq", _ZWISCHEN),
    "E_min": ("niedrigstes Treibhauspotenzial der zulässigen Alternativen", "kg CO₂-Äq", _ZWISCHEN),
    "K_R": ("Kosten der Rückfall-Alternative", "€", _ZWISCHEN),
    "E_R": ("Treibhauspotenzial der Rückfall-Alternative", "kg CO₂-Äq", _ZWISCHEN),
}

# Einheit des Ergebnisses, wo der Kern keine angibt (Punkte und Skalen), nach Schritt.bezeichnung
PUNKTE = "Punkte"
SKALA = "Skala 1 bis 5"


def einheit_ergebnis(bereich: str, bezeichnung: str, einheit: str) -> str:
    if einheit:
        return einheit
    if bereich == "technik" and bezeichnung == "Dimensionswert technisch":
        return ""  # dimensionslose Stufe, Skala 1 bis 5 steht in der Beschriftung
    if bereich in ("technik", "normalisierung", "beitrag", "nutzwert"):
        return PUNKTE
    return ""


# ---------------------------------------------------------------- Glossar (Begriffe aus Kapitel 4)

GLOSSAR: list[tuple[str, str, str]] = [
    ("Core", "Das geschädigte Altteil, über dessen Verwendung entschieden wird. Bewertet wird ein Core, dessen "
             "grundsätzliche Eignung für die Wiederaufbereitung festgestellt ist und für den ein konkretes "
             "Schadensbild vorliegt.", "4.1.1"),
    ("Handlungsalternative", "Interne Wiederaufbereitung, externe Wiederaufbereitung, Neuteilersatz und "
                             "Ausscheiden. Im Baukasten lassen sich weitere Alternativen anlegen.", "4.1.2"),
    ("Gate (vorgelagerte Eignungsprüfung)", "Operative Prüfung vor der taktischen Bewertung. Sie klärt, ob das "
                                            "Bauteil wiederaufbereitbar ist, ob ein Ersatzbedarf besteht und ob "
                                            "ein Neuteil verfügbar ist. Alternativen, die das Gate nicht "
                                            "bestehen, scheiden vor jeder Rechnung aus.", "4.1.4"),
    ("Ausschlusskriterium", "Hartes, nicht kompensatorisches Kriterium. Erhält ein Unterkriterium die Stufe 1, "
                            "entfällt die Alternative unabhängig von allen übrigen Bewertungen (zweite Ebene des "
                            "Ausschlusses).", "4.1.4, 4.3.1"),
    ("Unterkriterium", "Bestandteil der technischen Dimension: Technologieverfügbarkeit, Prozessfähigkeit, "
                       "Beherrschbarkeit des Schadensgrads und Werkstoffeignung, je auf der fünfstufigen Skala "
                       "nach Tabelle 8 bewertet.", "4.3.1"),
    ("Dimensionswert", "Gewichtete Summe der Unterkriterien nach Formel (5), weiterhin auf der Skala von eins "
                       "bis fünf.", "4.3.1"),
    ("Technische Konvention", "Neuteilersatz und Ausscheiden führen kein Verfahren am Bauteil aus. Sie werden "
                              "nicht über die Unterkriterien bewertet, sondern erhalten den Höchstwert der "
                              "Skala. Szenario S10 prüft diese Konvention.", "4.3.1"),
    ("Position", "Einzelner Kosten- oder CO₂-Posten einer Alternative, im Werkzeug als Formel über Felder und "
                 "Hilfsgrößen. Die Summe der Positionen ist der Rohwert der ökonomischen oder ökologischen "
                 "Dimension.", "4.3.2, 4.3.3"),
    ("Feld", "Eingangsgröße des Falls mit Wert, Einheit, Herkunft, Quelle und Spanne, z. B. der Lohnsatz.", "Kapitel 5"),
    ("Hilfsgröße", "Benannte Zwischenformel, z. B. eine Bearbeitungszeit, die in mehreren Positionen verwendet "
                   "wird.", "Kapitel 5"),
    ("Herkunft (L), (A), (N)", "Kennzeichnung jedes Felds: (L) Literatur, (A) Annahme, (N) Nutzerangabe. Wird "
                               "ein Wert geändert, wechselt die Herkunft auf (N).", "Kapitel 5"),
    ("Funktionelle Einheit", "Die Bereitstellung eines einsatzfähigen Bauteils. Normalisiert wird nur über "
                             "Alternativen, die dieselbe funktionelle Einheit bereitstellen.", "4.3.3"),
    ("Treibhauspotenzial", "Ergebnis E_a der ökologischen Bilanz einer Alternative nach Formel (8) in kg "
                           "CO₂-Äquivalent.", "4.3.3"),
    ("Lokale und globale Skala", "Eine lokale Skala wird durch die betrachteten Alternativen festgelegt (beste "
                                 "100, schlechteste 0 Punkte, Formel 9). Eine globale Skala ist unabhängig von "
                                 "den Alternativen festgelegt (technische Dimension, Formel 6).", "4.4.1"),
    ("Normalisierung", "Überführung der drei Dimensionen auf eine gemeinsame Skala von null bis hundert "
                       "Punkten nach den Formeln (6) und (9).", "4.4.1"),
    ("Beitrag einer Dimension", "Produkt aus Gewicht und normalisiertem Wert einer Dimension. Die drei Beiträge "
                                "ergeben zusammen den Gesamtnutzwert.", "4.4.3"),
    ("Gesamtnutzwert", "Gewichtete Summe der normalisierten Werte nach Formel (10) auf der Skala von null bis "
                       "hundert. Die Alternative mit dem höchsten Gesamtnutzwert ist unter den eingegebenen "
                       "Werten die empfohlene.", "4.4.3"),
    ("Implizite Austauschrate", "Bewertung einer Tonne CO₂-Äquivalent in Euro, die aus den Gewichten und den "
                                "Spannweiten der Kosten und des Treibhauspotenzials folgt. Sie ist keine "
                                "Eigenschaft des Kennzahlensystems, sondern eine Folge des Alternativenfelds.",
     "4.4.2"),
    ("Einflussfaktor", "Externe Größe wie Lieferzeit, Vertragsstrafe, Stillstand oder Ausschussrisiko, die "
                       "einem Szenario zugeordnet wird.", "4.5.3"),
    ("Faktorbaustein", "Baustein, der einen Einflussfaktor über Größen einbringt, die das Modell bereits "
                       "enthält: Verzug nach Formel (11) und Ausschussrisiko nach den Formeln (12) und (13). "
                       "Im Referenzfall sind beide wirkungslos gesetzt.", "4.5.3"),
    ("Weiche und harte Frist", "Eine weiche Frist führt bei Überschreitung zu Verzugskosten. Eine harte Frist "
                               "ist ein Ausschlusskriterium. Hält keine Alternative die harte Frist, wird sie "
                               "als weiche Frist behandelt.", "4.5.3"),
    ("Szenario", "Kombination von Einflussfaktoren und gegebenenfalls eigenen Gewichten. Der Basisfall ist "
                 "das Modell ohne Einflussfaktoren.", "4.5.4"),
    ("Kipppunkt", "Wert einer Eingangsgröße oder eines Einflussfaktors, bei dem zwei Alternativen denselben "
                  "Gesamtnutzwert erreichen. Jenseits davon ändert sich die Rangfolge.", "4.5.1, 4.5.3"),
]
