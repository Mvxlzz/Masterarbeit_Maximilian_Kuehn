/**
 * Deutsches Zahlenformat für alle Anzeigen.
 * Port von app/format.py. Die Oberfläche formatiert Zahlen ausschließlich über diese Funktionen.
 */

export const LEER = "—";
export const UNBEGRENZT = "keine Obergrenze";
const OHNE_EINHEIT = new Set(["", "—"]);

export const CO2 = "kg CO₂-Äq";

function istEndlich(x: number | null | undefined): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** 1196.853 -> '1.196,85'. null/NaN -> '—', unendlich -> 'keine Obergrenze'. */
export function zahl(x: number | null | undefined, stellen = 2): string {
  if (x === null || x === undefined || Number.isNaN(x)) return LEER;
  if (x === Infinity) return UNBEGRENZT;
  if (x === -Infinity) return `-${UNBEGRENZT}`;
  let v = x;
  if (Number(v.toFixed(stellen)) === 0) v = 0;
  const s = v.toFixed(stellen);
  const [ganzTeil, nachkomma] = s.split(".");
  const neg = ganzTeil.startsWith("-");
  const digits = neg ? ganzTeil.slice(1) : ganzTeil;
  const mitPunkt = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const vorzeichen = neg ? "-" : "";
  return nachkomma !== undefined
    ? `${vorzeichen}${mitPunkt},${nachkomma}`
    : `${vorzeichen}${mitPunkt}`;
}

/** Wert mit Einheit, z. B. '11,45 €/kg'. Dimensionslose Größen ('—') ohne Einheit. */
export function mitEinheit(
  x: number | null | undefined,
  einheit: string,
  stellen = 2
): string {
  const s = zahl(x, stellen);
  if (OHNE_EINHEIT.has(einheit) || s === LEER || s === UNBEGRENZT) return s;
  return `${s} ${einheit}`;
}

export function euro(x: number | null | undefined): string {
  return mitEinheit(x, "€", 2);
}

export function punkte(x: number | null | undefined): string {
  return mitEinheit(x, "Punkte", 2);
}

export function co2(x: number | null | undefined): string {
  return mitEinheit(x, CO2, 2);
}

export function gewicht(x: number | null | undefined): string {
  return zahl(x, 3);
}

/** Bis zu sechs Nachkommastellen ohne Nullen am Ende, für Spannen und Hinweise. 0.5508 -> '0,5508'. */
export function kompakt(
  x: number | null | undefined,
  einheit = "",
  stellen = 6
): string {
  let s = zahl(x, stellen);
  if (s.includes(",")) {
    s = s.replace(/0+$/, "").replace(/,$/, "");
  }
  if (OHNE_EINHEIT.has(einheit) || s === LEER || s === UNBEGRENZT) return s;
  return `${s} ${einheit}`;
}

/**
 * Wert im Rechenweg: bis zu vier Nachkommastellen ohne Nullen am Ende. 1.0638297 -> '1,0638', 0.94 -> '0,94', 1196.8534 -> '1.196,8534'.
 */
export function rechenwert(x: number | null | undefined, einheit = ""): string {
  return kompakt(x, einheit, 4);
}

/**
 * Wert für ein Eingabefeld: wie kompakt(), aber ohne Tausenderpunkt, damit lesen() den Text
 * eindeutig zurückliest. 1196.85 -> '1196,85'.
 */
export function eingabe(x: number): string {
  if (x === Infinity || x === -Infinity) return UNBEGRENZT;
  return kompakt(x).replace(/\./g, "");
}

/**
 * Liest eine Zahl aus einem Eingabefeld.
 *
 * Mit Komma gilt das deutsche Format ('1.196,85'). Ohne Komma gilt ein Punkt als Dezimalpunkt
 * ('11.45'), damit ein Tippfehler nach dem Neuformatieren sichtbar wird. 'keine Obergrenze',
 * 'unbegrenzt' und '∞' ergeben unendlich.
 */
export function lesen(text: string): number {
  const s0 = text.trim().replace(/\s/g, "");
  if (["keineobergrenze", "unbegrenzt", "∞"].includes(s0.toLowerCase())) {
    return Infinity;
  }
  let s = s0;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(/,/g, ".");
  }
  if (s === "" || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) {
    throw new Error(`„${text.trim()}“ ist keine Zahl.`);
  }
  const x = Number(s);
  if (Number.isNaN(x) || !Number.isFinite(x)) {
    throw new Error(`„${text.trim()}“ ist keine Zahl.`);
  }
  return x;
}

/**
 * Ungerundeter Wert für den CSV-Export (E21): Dezimalkomma, kein Tausenderpunkt, bis 15 signifikante
 * Stellen. 1196.8534… -> '1196,85339…', 0.5508 -> '0,5508', unendlich -> 'keine Obergrenze', null -> ''.
 */
export function roh(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "";
  if (x === Infinity) return UNBEGRENZT;
  if (x === -Infinity) return `-${UNBEGRENZT}`;
  const s = Number(x.toPrecision(15)).toString();
  return s.replace(".", ",");
}

/**
 * Kipppunkt wie in REFERENZWERTE.md, Abschnitt 3: unter 10 drei Nachkommastellen (0,800), sonst zwei
 * (35,01 €/Arbeitstag).
 */
export function kipppunkt(x: number | null | undefined, einheit = ""): string {
  const stellen = istEndlich(x) && Math.abs(x) < 10 ? 3 : 2;
  return mitEinheit(x, einheit, stellen);
}

/** Differenz mit Vorzeichen: 4.7945 -> '+4,79 Punkte', -2.1 -> '−2,10 Punkte', 0 -> '±0,00 Punkte'. */
export function differenz(
  x: number | null | undefined,
  einheit = "Punkte",
  stellen = 2
): string {
  let s = zahl(x, stellen);
  if (s === LEER) return s;
  if (s.startsWith("-")) {
    s = "−" + s.slice(1);
  } else if (s.replace(/[0,.]/g, "") === "") {
    s = "±" + s;
  } else {
    s = "+" + s;
  }
  return OHNE_EINHEIT.has(einheit) ? s : `${s} ${einheit}`;
}

/** Anteil als Prozent: 0.06 -> '6,0 %'. */
export function prozent(anteil: number | null | undefined, stellen = 1): string {
  if (anteil === null || anteil === undefined) return LEER;
  return mitEinheit(anteil * 100, "%", stellen);
}

/** Uhrzeit eines ISO-Zeitstempels in Ortszeit, z. B. „14:05“ (Speicherstand im Konto). */
export function uhrzeit(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
