/**
 * Anzeige-Hilfen für die Sensitivität. Keine Fachrechnung:
 * Sieger und Abstände kommen aus der API; hier nur Beschriftung, Vorschläge und Diagrammgeometrie.
 */

import type { FallDatei } from "@/lib/api";

export const GEWICHTE = ["w_tech", "w_oekon", "w_oekol"] as const;

export type GewichtSchluessel = (typeof GEWICHTE)[number];

const GEWICHT_TEXT: Record<GewichtSchluessel, string> = {
  w_tech: "Gewicht technisch",
  w_oekon: "Gewicht ökonomisch",
  w_oekol: "Gewicht ökologisch",
};

/** Suchbereich-Vorschläge; Quelle der Wahrheit: GET /katalog. Fallback aus app/katalog.py. */
export const BEREICH: Record<string, [number, number]> = {
  strafe_tag: [0, 400],
  stillstand_tag: [0, 400],
  frist: [0, 30],
  lieferzeit_intern: [5, 30],
  lieferzeit_extern: [5, 30],
  lieferzeit_neuteil: [0, 30],
  strafe_max: [0, 10000],
  ausschuss: [0, 1],
  entfernung: [0, 5000],
};

export type FeldInfo = {
  name: string;
  bezeichnung: string;
  einheit: string;
  wert: number;
  spanne: [number, number] | null;
  herkunft: string;
  quelle: string;
  gruppe?: string;
};

export type AltInfo = { schluessel: string; name: string; art?: string };

export type SzenarioInfo = {
  schluessel: string;
  name: string;
  faktoren?: string[];
};

type ModellRoh = {
  felder?: FeldInfo[];
  alternativen?: AltInfo[];
  szenarien?: SzenarioInfo[];
};

function modell(datei: FallDatei | null | undefined): ModellRoh {
  return (datei?.modell as ModellRoh) ?? {};
}

export function felderAusDatei(datei: FallDatei | null | undefined): FeldInfo[] {
  return modell(datei).felder ?? [];
}

export function alternativenAusDatei(datei: FallDatei | null | undefined): AltInfo[] {
  return modell(datei).alternativen ?? [];
}

export function szenarienAusDatei(datei: FallDatei | null | undefined): SzenarioInfo[] {
  return modell(datei).szenarien ?? [];
}

export function nameAlternative(
  datei: FallDatei | null | undefined,
  schluessel: string
): string {
  const a = alternativenAusDatei(datei).find((x) => x.schluessel === schluessel);
  return a?.name ?? schluessel;
}

/** Bezeichnung und Einheit einer Größe (Feld oder Dimensionsgewicht). */
export function groesseText(
  datei: FallDatei | null | undefined,
  groesse: string
): { text: string; einheit: string } {
  if (groesse in GEWICHT_TEXT) {
    return { text: GEWICHT_TEXT[groesse as GewichtSchluessel], einheit: "—" };
  }
  const f = felderAusDatei(datei).find((x) => x.name === groesse);
  if (f) return { text: f.bezeichnung, einheit: f.einheit || "—" };
  return { text: groesse, einheit: "—" };
}

/** Anzeigetext für Select: „Bezeichnung (name)“ bzw. nur Bezeichnung bei Gewichten. */
export function groesseLabel(datei: FallDatei | null | undefined, groesse: string): string {
  const { text } = groesseText(datei, groesse);
  if (GEWICHTE.includes(groesse as GewichtSchluessel)) return text;
  return `${text} (${groesse})`;
}

/**
 * Vorschlag für von/bis (Port von app/zustand.standardbereich).
 * Nur Eingabevorschlag; die Berechnung läuft in der API.
 */
export function standardbereich(
  datei: FallDatei | null | undefined,
  groesse: string
): [number, number] {
  if (groesse.startsWith("w_")) return [0, 1];
  if (groesse in BEREICH) return BEREICH[groesse];
  const f = felderAusDatei(datei).find((x) => x.name === groesse);
  if (f?.spanne && f.spanne[0] !== f.spanne[1]) {
    return [Math.min(...f.spanne), Math.max(...f.spanne)];
  }
  if (f && Number.isFinite(f.wert) && f.wert > 0) return [0, 2 * f.wert];
  return [0, 1];
}

/**
 * Wechselt der Abstand an einer Grenze das Vorzeichen gegenüber dem Referenzabstand?
 * (app/diagramme.kehrt_um – nur Vorzeichenvergleich, keine Rechnung.)
 */
export function kehrtUm(referenz: number, ...abstaende: number[]): boolean {
  const refNeg = referenz < 0;
  return abstaende.some((d) => d === d && d < 0 !== refNeg);
}

/**
 * Baryzentrische Koordinaten → Bildschirmposition im gleichseitigen Dreieck.
 * Ecken: tech oben, ökol unten links, ökon unten rechts. Keine Fachrechnung.
 */
export function baryzentrisch(
  wTech: number,
  wOekon: number,
  wOekol: number,
  breite: number,
  hoehe: number,
  padding = 28
): { x: number; y: number } {
  const top = { x: breite / 2, y: padding };
  const bl = { x: padding, y: hoehe - padding };
  const br = { x: breite - padding, y: hoehe - padding };
  return {
    x: wTech * top.x + wOekol * bl.x + wOekon * br.x,
    y: wTech * top.y + wOekol * bl.y + wOekon * br.y,
  };
}

/** CSS-Variablen der Alternativenfarben (DESIGN.md). */
export const ALT_FARBE: Record<string, string> = {
  intern: "var(--alt-intern)",
  extern: "var(--alt-extern)",
  neuteil: "var(--alt-neuteil)",
  ausscheiden: "var(--alt-ausscheiden)",
};

const WEITERE = ["#4a3aa7", "#eda100", "#1baf7a"] as const;

export function farbeAlternative(
  schluessel: string | null | undefined,
  alle?: string[]
): string {
  if (!schluessel) return "var(--linie)";
  if (schluessel in ALT_FARBE) return ALT_FARBE[schluessel];
  const rest = (alle ?? []).filter((s) => !(s in ALT_FARBE));
  const i = rest.indexOf(schluessel);
  if (i >= 0 && i < WEITERE.length) return WEITERE[i];
  return "var(--text-gedaempft)";
}

/** Formkodierung: Kreis intern, Quadrat extern, Dreieck Neuteil, Raute Ausscheiden. */
export type AltForm = "kreis" | "quadrat" | "dreieck" | "raute" | "punkt";

export function formAlternative(schluessel: string | null | undefined): AltForm {
  switch (schluessel) {
    case "intern":
      return "kreis";
    case "extern":
      return "quadrat";
    case "neuteil":
      return "dreieck";
    case "ausscheiden":
      return "raute";
    default:
      return "punkt";
  }
}

/** Größenliste für Verlauf: Gewichte + Felder. */
export function groessenListe(
  datei: FallDatei | null | undefined,
  gewichte = true
): string[] {
  const felder = felderAusDatei(datei).map((f) => f.name);
  return gewichte ? [...GEWICHTE, ...felder] : felder;
}
