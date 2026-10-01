"""Sicherer Formelauswerter für Formeln, die Anwender im Baukasten eingeben.

Formeln werden mit `ast` zerlegt und Knoten für Knoten ausgewertet. Es gibt kein `eval` und kein
`exec`. Erlaubt sind Zahlen, Namen von Feldern und Hilfsgrößen, die Grundrechenarten, Potenzen,
Klammern, Vergleiche und die Funktionen in FUNKTIONEN sowie `kosten("alt")` und `co2("alt")`.
Alles andere wird mit einer deutschen Fehlermeldung abgewiesen.
"""
from __future__ import annotations

import ast
import math
from functools import lru_cache
from typing import Callable

FUNKTIONEN: dict[str, Callable[..., float]] = {
    "min": min,
    "max": max,
    "abs": abs,
    "aufrunden": lambda x: float(math.ceil(x)),
    "abrunden": lambda x: float(math.floor(x)),
}
SUMMENFUNKTIONEN = ("kosten", "co2")
ERLAUBTE_FUNKTIONEN = (*FUNKTIONEN, "wenn", *SUMMENFUNKTIONEN)

_BINAER = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
    ast.Pow: lambda a, b: a ** b,
}
_VERGLEICH = {
    ast.Lt: lambda a, b: a < b,
    ast.LtE: lambda a, b: a <= b,
    ast.Gt: lambda a, b: a > b,
    ast.GtE: lambda a, b: a >= b,
    ast.Eq: lambda a, b: a == b,
    ast.NotEq: lambda a, b: a != b,
}


class FormelFehler(ValueError):
    """Formel ist ungültig oder lässt sich nicht auswerten. Die Meldung ist für Anwender lesbar."""


@lru_cache(maxsize=4096)
def zerlege(formel: str) -> ast.expr:
    """Zerlegt und prüft eine Formel. Ergebnis wird zwischengespeichert."""
    text = (formel or "").strip()
    if not text:
        raise FormelFehler("Die Formel ist leer.")
    try:
        baum = ast.parse(text, mode="eval").body
    except SyntaxError as e:
        raise FormelFehler(f"Die Formel „{text}“ ist nicht lesbar (Zeichen {e.offset}).") from None
    _pruefe(baum, text)
    return baum


def _pruefe(knoten: ast.AST, text: str) -> None:
    for k in ast.walk(knoten):
        if isinstance(k, (ast.Expression, ast.Load, ast.operator, ast.unaryop, ast.cmpop)):
            continue
        if isinstance(k, ast.Constant):
            if not isinstance(k.value, (int, float, str)) or isinstance(k.value, bool):
                raise FormelFehler(f"Unzulässiger Wert in „{text}“.")
            continue
        if isinstance(k, ast.BinOp):
            if type(k.op) not in _BINAER:
                raise FormelFehler(f"Rechenzeichen in „{text}“ nicht erlaubt. Erlaubt sind + − * / **.")
            continue
        if isinstance(k, ast.UnaryOp):
            if not isinstance(k.op, (ast.USub, ast.UAdd)):
                raise FormelFehler(f"Operator in „{text}“ nicht erlaubt.")
            continue
        if isinstance(k, ast.Compare):
            if any(type(o) not in _VERGLEICH for o in k.ops):
                raise FormelFehler(f"Vergleich in „{text}“ nicht erlaubt.")
            continue
        if isinstance(k, ast.Name):
            if k.id.startswith("_"):
                raise FormelFehler(f"Name „{k.id}“ nicht erlaubt.")
            continue
        if isinstance(k, ast.Call):
            if not isinstance(k.func, ast.Name) or k.func.id not in ERLAUBTE_FUNKTIONEN:
                raise FormelFehler(
                    f"Unbekannte Funktion in „{text}“. Erlaubt sind {', '.join(ERLAUBTE_FUNKTIONEN)}.")
            if k.keywords:
                raise FormelFehler(f"Benannte Argumente sind in „{text}“ nicht erlaubt.")
            if k.func.id in SUMMENFUNKTIONEN and (
                    len(k.args) != 1 or not isinstance(k.args[0], ast.Constant)
                    or not isinstance(k.args[0].value, str)):
                raise FormelFehler(f"{k.func.id}() erwartet genau eine Alternative in Anführungszeichen, "
                                   f"z. B. {k.func.id}(\"neuteil\").")
            if k.func.id == "wenn" and len(k.args) != 3:
                raise FormelFehler("wenn() erwartet drei Argumente: Bedingung, Wert wenn ja, Wert wenn nein.")
            continue
        raise FormelFehler(f"Ausdruck vom Typ {type(k).__name__} ist in „{text}“ nicht erlaubt.")
    # Zeichenketten nur als Argument von kosten() und co2()
    erlaubt = {id(c.args[0]) for c in ast.walk(knoten)
               if isinstance(c, ast.Call) and isinstance(c.func, ast.Name) and c.func.id in SUMMENFUNKTIONEN}
    for k in ast.walk(knoten):
        if isinstance(k, ast.Constant) and isinstance(k.value, str) and id(k) not in erlaubt:
            raise FormelFehler(f"Text ist in „{text}“ nur als Alternative in kosten() oder co2() erlaubt.")


def namen(formel: str) -> set[str]:
    """Alle Feld- und Hilfsgrößennamen, die eine Formel verwendet."""
    return {k.id for k in ast.walk(zerlege(formel)) if isinstance(k, ast.Name)} - set(ERLAUBTE_FUNKTIONEN)


def summenbezuege(formel: str) -> set[tuple[str, str]]:
    """Paare (dimension, alternative) aus kosten("…") und co2("…")."""
    return {(k.func.id, k.args[0].value) for k in ast.walk(zerlege(formel))
            if isinstance(k, ast.Call) and isinstance(k.func, ast.Name) and k.func.id in SUMMENFUNKTIONEN}


def auswerten(formel: str, name: Callable[[str], float],
              summe: Callable[[str, str], float] | None = None) -> float:
    """Wertet eine Formel aus. `name` liefert den Wert eines Namens, `summe(dimension, alternative)`
    die Summe der Positionen einer Alternative."""
    baum = zerlege(formel)

    def w(k: ast.AST) -> float:
        if isinstance(k, ast.Constant):
            return float(k.value)
        if isinstance(k, ast.Name):
            return float(name(k.id))
        if isinstance(k, ast.UnaryOp):
            x = w(k.operand)
            return -x if isinstance(k.op, ast.USub) else x
        if isinstance(k, ast.BinOp):
            a, b = w(k.left), w(k.right)
            try:
                return float(_BINAER[type(k.op)](a, b))
            except ZeroDivisionError:
                raise FormelFehler(f"Division durch null in „{formel}“.") from None
            except OverflowError:
                raise FormelFehler(f"Zahlenüberlauf in „{formel}“.") from None
        if isinstance(k, ast.Compare):
            links = w(k.left)
            for op, rechts_k in zip(k.ops, k.comparators):
                rechts = w(rechts_k)
                if not _VERGLEICH[type(op)](links, rechts):
                    return 0.0
                links = rechts
            return 1.0
        if isinstance(k, ast.Call):
            f = k.func.id
            if f == "wenn":
                return w(k.args[1]) if w(k.args[0]) else w(k.args[2])
            if f in SUMMENFUNKTIONEN:
                if summe is None:
                    raise FormelFehler(f"{f}() ist an dieser Stelle nicht verfügbar.")
                return float(summe(f, k.args[0].value))
            try:
                return float(FUNKTIONEN[f](*(w(a) for a in k.args)))
            except (OverflowError, ValueError):  # z. B. abrunden(1e400): unendlich hat keine Ganzzahl
                raise FormelFehler(f"Zahlenüberlauf in „{formel}“.") from None
        raise FormelFehler(f"Nicht auswertbar: {formel}")

    ergebnis = w(baum)
    if isinstance(ergebnis, complex) or math.isnan(ergebnis):
        raise FormelFehler(f"Die Formel „{formel}“ liefert keine reelle Zahl.")
    return ergebnis


_LATEX_OP = {ast.Add: "+", ast.Sub: "-", ast.Mult: r"\cdot", ast.Pow: "^"}
_LATEX_VGL = {ast.Lt: "<", ast.LtE: r"\le", ast.Gt: ">", ast.GtE: r"\ge", ast.Eq: "=", ast.NotEq: r"\ne"}
_RANG = {ast.Add: 1, ast.Sub: 1, ast.Mult: 2, ast.Div: 2, ast.Pow: 3}


def als_latex(formel: str, symbole: dict[str, str] | None = None) -> str:
    """LaTeX-Darstellung einer Formel für die Anzeige. `symbole` ersetzt Namen durch Formelzeichen."""
    symbole = symbole or {}

    def name(n: str) -> str:
        if n in symbole:
            return symbole[n]
        return r"\mathit{" + n.replace("_", r"\_") + "}"

    def zahl(x: float) -> str:
        s = f"{x:g}".replace(".", "{,}")
        return s

    def t(k: ast.AST, eltern: int = 0) -> str:
        if isinstance(k, ast.Constant):
            return r"\text{" + k.value + "}" if isinstance(k.value, str) else zahl(k.value)
        if isinstance(k, ast.Name):
            return name(k.id)
        if isinstance(k, ast.UnaryOp):
            return ("-" if isinstance(k.op, ast.USub) else "") + t(k.operand, 3)
        if isinstance(k, ast.BinOp):
            r = _RANG[type(k.op)]
            if isinstance(k.op, ast.Div):
                return r"\frac{" + t(k.left) + "}{" + t(k.right) + "}"
            if isinstance(k.op, ast.Pow):
                s = t(k.left, 4) + "^{" + t(k.right) + "}"
            else:
                s = t(k.left, r) + f" {_LATEX_OP[type(k.op)]} " + t(k.right, r + (isinstance(k.op, ast.Sub)))
            return r"\left(" + s + r"\right)" if r < eltern else s
        if isinstance(k, ast.Compare):
            s = t(k.left)
            for op, c in zip(k.ops, k.comparators):
                s += f" {_LATEX_VGL[type(op)]} " + t(c)
            return s
        if isinstance(k, ast.Call):
            f = k.func.id
            if f == "aufrunden":
                return r"\left\lceil " + t(k.args[0]) + r" \right\rceil"
            if f == "abrunden":
                return r"\left\lfloor " + t(k.args[0]) + r" \right\rfloor"
            if f == "abs":
                return r"\left| " + t(k.args[0]) + r" \right|"
            if f in SUMMENFUNKTIONEN:
                return (r"K_{\text{" if f == "kosten" else r"E_{\text{") + k.args[0].value + "}}"
            return r"\operatorname{" + f + r"}\left(" + ", ".join(t(a) for a in k.args) + r"\right)"
        return "?"

    return t(zerlege(formel))
