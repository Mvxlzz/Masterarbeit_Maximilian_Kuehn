/**
 * Einflussfaktoren, Szenarien und Faktorbausteine in der Fall-Datei.
 * Keine Rechnung: nur Zugriff auf die Fall-Datei und Aufbereitung der Antworten von /szenarien für die Anzeige.
 * Formeln prüft der Kern (/pruefen), Werte und Rangfolgen liefert /szenarien bzw. /bausteine.
 */

import type { FallDatei, SzenarioVergleich } from "@/lib/api";
import { type Feld, type Gewichte, type Position, mitModell } from "@/lib/fall";
import { LEER, kompakt, zahl } from "@/lib/format";

export type FaktorTyp = "wertaenderung" | "zuschlag" | "einstellung";

export type Faktor = {
  schluessel: string;
  name: string;
  typ: FaktorTyp;
  beschreibung: string;
  setzen: Record<string, number>;
  skalieren: Record<string, number>;
  positionen: Position[];
  einstellungen: Record<string, number>;
};

export type Szenario = {
  schluessel: string;
  name: string;
  faktoren: string[];
  gewichte: Gewichte | null;
  beschreibung: string;
};

export type Bausteine = {
  lieferzeit: Record<string, string>;
  frist: string;
  strafe_tag: string;
  strafe_max: string;
  stillstand_tag: string;
  ausschuss: string;
  rueckfall: string;
  harte_frist: boolean;
};

/** Formelfelder der Faktorbausteine in der Reihenfolge der Anzeige (ohne Lieferzeiten je Alternative). */
export const BAUSTEIN_FORMELN = ["frist", "strafe_tag", "strafe_max", "stillstand_tag", "ausschuss"] as const;
export type BausteinFormel = (typeof BAUSTEIN_FORMELN)[number];

/** Einstellungen mit Ja/Nein (1/0); die übrige (s_tech_ohne_verfahren) ist eine Stufe 1 bis 5. */
export const EINSTELLUNG_JA_NEIN = new Set([
  "bauteil_aufbereitbar",
  "ersatzbedarf",
  "neuteil_verfuegbar",
  "harte_frist",
]);

type Roh = {
  faktoren?: Faktor[];
  szenarien?: Szenario[];
  bausteine?: Bausteine;
  felder?: Feld[];
  gewichte?: Gewichte;
};

function roh(datei: FallDatei | null | undefined): Roh {
  return ((datei?.modell as Roh) ?? {}) as Roh;
}

export function faktoren(datei: FallDatei | null | undefined): Faktor[] {
  return (roh(datei).faktoren ?? []).map((f) => ({
    ...f,
    beschreibung: f.beschreibung ?? "",
    setzen: f.setzen ?? {},
    skalieren: f.skalieren ?? {},
    positionen: f.positionen ?? [],
    einstellungen: f.einstellungen ?? {},
  }));
}

export function szenarien(datei: FallDatei | null | undefined): Szenario[] {
  return (roh(datei).szenarien ?? []).map((s) => ({
    ...s,
    faktoren: s.faktoren ?? [],
    gewichte: s.gewichte ?? null,
    beschreibung: s.beschreibung ?? "",
  }));
}

export function bausteine(datei: FallDatei | null | undefined): Bausteine {
  const b = roh(datei).bausteine;
  return {
    lieferzeit: b?.lieferzeit ?? {},
    frist: b?.frist ?? "0",
    strafe_tag: b?.strafe_tag ?? "0",
    strafe_max: b?.strafe_max ?? "",
    stillstand_tag: b?.stillstand_tag ?? "0",
    ausschuss: b?.ausschuss ?? "0",
    rueckfall: b?.rueckfall ?? "",
    harte_frist: Boolean(b?.harte_frist),
  };
}

/* ------------------------------------------------------------------ Faktorbausteine */

/** Ort der Prüfmeldungen aus kern.modell.pruefe_modell je Baustein (wie app/zustand.py). */
export function bausteinOrt(ziel: string): string {
  if (ziel.startsWith("lieferzeit:")) return `Baustein Lieferzeit ${ziel.slice("lieferzeit:".length)}`;
  const text: Record<string, string> = {
    frist: "Frist",
    strafe_tag: "Strafe je Arbeitstag",
    strafe_max: "Obergrenze",
    stillstand_tag: "Stillstand",
    ausschuss: "Ausschussrisiko",
  };
  return `Baustein ${text[ziel] ?? ziel}`;
}

export function setzeBausteine(datei: FallDatei, patch: Partial<Bausteine>): FallDatei {
  return mitModell(datei, (m) => ({ ...m, bausteine: { ...bausteine(datei), ...patch } }));
}

export function setzeLieferzeit(datei: FallDatei, alternative: string, formel: string): FallDatei {
  const b = bausteine(datei);
  return setzeBausteine(datei, { lieferzeit: { ...b.lieferzeit, [alternative]: formel } });
}

/* ------------------------------------------------------------------ Schlüssel */

/** Schlüssel aus einem Namen: Kleinbuchstaben, Umlaute ausgeschrieben, sonst Unterstrich; eindeutig. */
export function neuerSchluessel(name: string, vorhanden: string[], praefix = "f"): string {
  const basis =
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || praefix;
  const start = /^[0-9]/.test(basis) ? `${praefix}_${basis}` : basis;
  let s = start;
  for (let i = 2; vorhanden.includes(s); i++) s = `${start}_${i}`;
  return s;
}

/** Nächster freier Szenario-Schlüssel: S und die nächste ganze Zahl nach der höchsten vorhandenen (S12 nach S11). */
export function naechsterSzenarioSchluessel(vorhanden: string[]): string {
  let hoechste = -1;
  for (const s of vorhanden) {
    const treffer = /^S(\d+)/.exec(s);
    if (treffer) hoechste = Math.max(hoechste, Number(treffer[1]));
  }
  let nr = hoechste + 1;
  while (vorhanden.includes(`S${nr}`)) nr++;
  return `S${nr}`;
}

/* ------------------------------------------------------------------ Einflussfaktoren */

function mitFaktoren(datei: FallDatei, fn: (liste: Faktor[]) => Faktor[]): FallDatei {
  return mitModell(datei, (m) => ({ ...m, faktoren: fn(faktoren(datei)) }));
}

function mitFaktor(datei: FallDatei, schluessel: string, fn: (f: Faktor) => Faktor): FallDatei {
  return mitFaktoren(datei, (liste) => liste.map((f) => (f.schluessel === schluessel ? fn(f) : f)));
}

/** Legt einen leeren Einflussfaktor an und gibt Datei und Schlüssel zurück. */
export function neuerFaktor(
  datei: FallDatei,
  name: string,
  typ: FaktorTyp
): { datei: FallDatei; schluessel: string } {
  const schluessel = neuerSchluessel(name, faktoren(datei).map((f) => f.schluessel));
  const f: Faktor = {
    schluessel,
    name,
    typ,
    beschreibung: "",
    setzen: {},
    skalieren: {},
    positionen: [],
    einstellungen: {},
  };
  return { datei: mitFaktoren(datei, (liste) => [...liste, f]), schluessel };
}

export function setzeFaktor(
  datei: FallDatei,
  schluessel: string,
  patch: Partial<Pick<Faktor, "name" | "beschreibung" | "typ">>
): FallDatei {
  return mitFaktor(datei, schluessel, (f) => ({ ...f, ...patch }));
}

/** Löscht den Faktor und nimmt ihn aus allen Szenarien heraus. */
export function loescheFaktor(datei: FallDatei, schluessel: string): FallDatei {
  const ohne = mitFaktoren(datei, (liste) => liste.filter((f) => f.schluessel !== schluessel));
  return mitModell(ohne, (m) => ({
    ...m,
    szenarien: szenarien(ohne).map((s) => ({
      ...s,
      faktoren: s.faktoren.filter((k) => k !== schluessel),
    })),
  }));
}

export type WertArt = "setzen" | "skalieren";

export type WertEintrag = { feld: string; art: WertArt; wert: number };

/** Einträge einer Wertänderung als Zeilen: erst alle gesetzten, dann alle skalierten Felder. */
export function werteintraege(f: Faktor): WertEintrag[] {
  return [
    ...Object.entries(f.setzen).map(([feld, wert]) => ({ feld, art: "setzen" as const, wert })),
    ...Object.entries(f.skalieren).map(([feld, wert]) => ({ feld, art: "skalieren" as const, wert })),
  ];
}

/** Setzt einen Eintrag; ein Feld steht je Art höchstens einmal, bei Artwechsel wird es verschoben. */
export function setzeWerteintrag(
  datei: FallDatei,
  schluessel: string,
  eintrag: WertEintrag,
  vorher?: { feld: string; art: WertArt }
): FallDatei {
  return mitFaktor(datei, schluessel, (f) => {
    const setzen = { ...f.setzen };
    const skalieren = { ...f.skalieren };
    if (vorher) delete (vorher.art === "setzen" ? setzen : skalieren)[vorher.feld];
    (eintrag.art === "setzen" ? setzen : skalieren)[eintrag.feld] = eintrag.wert;
    return { ...f, setzen, skalieren };
  });
}

export function loescheWerteintrag(
  datei: FallDatei,
  schluessel: string,
  feld: string,
  art: WertArt
): FallDatei {
  return mitFaktor(datei, schluessel, (f) => {
    const kopie = { ...(art === "setzen" ? f.setzen : f.skalieren) };
    delete kopie[feld];
    return art === "setzen" ? { ...f, setzen: kopie } : { ...f, skalieren: kopie };
  });
}

export function neueZuschlagPosition(datei: FallDatei, schluessel: string, p: Position): FallDatei {
  return mitFaktor(datei, schluessel, (f) => ({ ...f, positionen: [...f.positionen, p] }));
}

export function setzeZuschlagPosition(
  datei: FallDatei,
  schluessel: string,
  index: number,
  patch: Partial<Position>
): FallDatei {
  return mitFaktor(datei, schluessel, (f) => ({
    ...f,
    positionen: f.positionen.map((p, i) => (i === index ? { ...p, ...patch } : p)),
  }));
}

export function loescheZuschlagPosition(datei: FallDatei, schluessel: string, index: number): FallDatei {
  return mitFaktor(datei, schluessel, (f) => ({
    ...f,
    positionen: f.positionen.filter((_, i) => i !== index),
  }));
}

export function setzeEinstellung(
  datei: FallDatei,
  schluessel: string,
  einstellung: string,
  wert: number,
  vorher?: string
): FallDatei {
  return mitFaktor(datei, schluessel, (f) => {
    const e = { ...f.einstellungen };
    if (vorher && vorher !== einstellung) delete e[vorher];
    e[einstellung] = wert;
    return { ...f, einstellungen: e };
  });
}

export function loescheEinstellung(datei: FallDatei, schluessel: string, einstellung: string): FallDatei {
  return mitFaktor(datei, schluessel, (f) => {
    const e = { ...f.einstellungen };
    delete e[einstellung];
    return { ...f, einstellungen: e };
  });
}

/** Kurzbeschreibung der Wirkung für Liste und Matrix, z. B. „setzt Frist auf 10 · skaliert Neuteilpreis ×2“. */
export function wirkung(
  f: Faktor,
  felder: Feld[],
  einstellungen: Record<string, string> = {}
): string {
  const text = (name: string) => felder.find((x) => x.name === name)?.bezeichnung ?? name;
  const teile: string[] = [];
  for (const [k, w] of Object.entries(f.setzen)) teile.push(`${text(k)} = ${kompakt(w, "", 4)}`);
  for (const [k, w] of Object.entries(f.skalieren)) teile.push(`${text(k)} × ${kompakt(w, "", 4)}`);
  for (const p of f.positionen) teile.push(`+ ${p.bezeichnung}`);
  for (const [k, w] of Object.entries(f.einstellungen)) {
    const name = einstellungen[k] ?? k;
    teile.push(EINSTELLUNG_JA_NEIN.has(k) ? `${name}: ${w ? "ja" : "nein"}` : `${name}: ${zahl(w, 0)}`);
  }
  return teile.length ? teile.join(" · ") : "noch ohne Inhalt";
}

/* ------------------------------------------------------------------ Szenarien und Matrix */

function mitSzenarien(datei: FallDatei, fn: (liste: Szenario[]) => Szenario[]): FallDatei {
  return mitModell(datei, (m) => ({ ...m, szenarien: fn(szenarien(datei)) }));
}

function mitSzenario(datei: FallDatei, schluessel: string, fn: (s: Szenario) => Szenario): FallDatei {
  return mitSzenarien(datei, (liste) => liste.map((s) => (s.schluessel === schluessel ? fn(s) : s)));
}

export function neuesSzenario(datei: FallDatei, name: string): { datei: FallDatei; schluessel: string } {
  const schluessel = naechsterSzenarioSchluessel(szenarien(datei).map((s) => s.schluessel));
  const s: Szenario = { schluessel, name, faktoren: [], gewichte: null, beschreibung: "" };
  return { datei: mitSzenarien(datei, (liste) => [...liste, s]), schluessel };
}

export function setzeSzenario(
  datei: FallDatei,
  schluessel: string,
  patch: Partial<Pick<Szenario, "name" | "beschreibung">>
): FallDatei {
  return mitSzenario(datei, schluessel, (s) => ({ ...s, ...patch }));
}

export function loescheSzenario(datei: FallDatei, schluessel: string): FallDatei {
  return mitSzenarien(datei, (liste) => liste.filter((s) => s.schluessel !== schluessel));
}

/** Häkchen der Matrix: ein neu gesetztes Häkchen hängt den Faktor hinten an (Reihenfolge = Anwendung). */
export function zuordnen(datei: FallDatei, szenario: string, faktor: string, an: boolean): FallDatei {
  return mitSzenario(datei, szenario, (s) => {
    const ohne = s.faktoren.filter((k) => k !== faktor);
    return { ...s, faktoren: an ? [...ohne, faktor] : ohne };
  });
}

/** Verschiebt einen Faktor in der Reihenfolge der Anwendung um eine Stelle (−1 nach vorn, +1 nach hinten). */
export function verschiebeFaktor(
  datei: FallDatei,
  szenario: string,
  faktor: string,
  richtung: -1 | 1
): FallDatei {
  return mitSzenario(datei, szenario, (s) => {
    const liste = [...s.faktoren];
    const i = liste.indexOf(faktor);
    const j = i + richtung;
    if (i < 0 || j < 0 || j >= liste.length) return s;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    return { ...s, faktoren: liste };
  });
}

/** Eigene Dimensionsgewichte je Szenario; `null` übernimmt die Gewichte des Falls. */
export function setzeSzenarioGewichte(
  datei: FallDatei,
  szenario: string,
  gewichte: Gewichte | null
): FallDatei {
  return mitSzenario(datei, szenario, (s) => ({ ...s, gewichte }));
}

/** Gewichte des Falls, als Ausgangspunkt für eigene Gewichte eines Szenarios. */
export function fallGewichte(datei: FallDatei | null | undefined): Gewichte {
  return roh(datei).gewichte ?? { tech: 1 / 3, oekon: 1 / 3, oekol: 1 / 3 };
}

/* ------------------------------------------------------------------ Vergleich (Anzeige der Antwort von /szenarien) */

/** Zeilenbeschriftung wie in app/diagramme.py: „Basisfall“ oder „S5 Ausschussrisiko und Verzug“. */
export function vergleichTitel(v: SzenarioVergleich): string {
  return v.szenario === null ? "Basisfall" : `${v.szenario} ${v.name ?? ""}`.trim();
}

/** Alternativen, die in mindestens einem Szenario zulässig sind, in der Reihenfolge des Modells. */
export function spaltenVergleich(vergleich: SzenarioVergleich[], reihenfolge: string[]): string[] {
  return reihenfolge.filter((a) => vergleich.some((v) => v.ergebnis && a in v.ergebnis.nutzwert));
}

/** Szenarien (ohne Basisfall), in denen eine andere Alternative als im Basisfall auf Rang 1 liegt. */
export function andereSieger(vergleich: SzenarioVergleich[]): SzenarioVergleich[] {
  return vergleich.filter((v) => v.szenario !== null && v.anderer_sieger);
}

/** Satz über dem Vergleich (wie app/seiten/szenarien.py). */
export function satzVergleich(vergleich: SzenarioVergleich[], namen: Record<string, string>): string {
  const basis = vergleich.find((v) => v.szenario === null)?.ergebnis;
  const erster = basis?.rangfolge[0];
  const anders = andereSieger(vergleich).map((v) => v.szenario as string);
  const m = vergleich.filter((v) => v.szenario !== null).length;
  const a = erster ? `Im Basisfall liegt ${namen[erster] ?? erster} auf Rang 1. ` : "";
  const b = anders.length
    ? `In ${anders.length} von ${m} Szenarien liegt eine andere Alternative vorn: ${anders.join(", ")}.`
    : "In allen Szenarien bleibt diese Alternative auf Rang 1.";
  return a + b;
}

/* ------------------------------------------------------------------ Heatmap-Farbe (Blaureihe, DESIGN.md Abschnitt 2) */

const SKALA_VON = [0xcd, 0xe2, 0xfb];
const SKALA_BIS = [0x0d, 0x36, 0x6b];
const SCHRIFT_DUNKEL = "#000000";
const SCHRIFT_HELL = "#ffffff";

function hex(rgb: number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function luminanz(farbe: string): number {
  const rgb = [1, 3, 5].map((i) => parseInt(farbe.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Kontrast nach WCAG zwischen zwei Hex-Farben. */
export function kontrast(a: string, b: string): number {
  const [x, y] = [luminanz(a), luminanz(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Zellfarbe für einen Gesamtnutzwert auf der Skala 0 bis 100 Punkte (hell = niedrig, dunkel = hoch). */
export function skalaFarbe(punkte: number): string {
  const t = Math.min(1, Math.max(0, punkte / 100));
  return hex(SKALA_VON.map((v, i) => v + (SKALA_BIS[i] - v) * t));
}

/** Schriftfarbe mit dem höheren Kontrast auf der Zellfarbe. */
export function schriftAufSkala(punkte: number): string {
  const grund = skalaFarbe(punkte);
  return kontrast(grund, SCHRIFT_DUNKEL) >= kontrast(grund, SCHRIFT_HELL) ? SCHRIFT_DUNKEL : SCHRIFT_HELL;
}

/** Zelltext der Heatmap: Gesamtnutzwert oder „K.O.“ für eine ausgeschlossene Alternative. */
export function zelltext(v: SzenarioVergleich, alternative: string): string {
  if (!v.ergebnis) return LEER;
  const w = v.ergebnis.nutzwert[alternative];
  return w === undefined ? "K.O." : zahl(w, 2);
}
