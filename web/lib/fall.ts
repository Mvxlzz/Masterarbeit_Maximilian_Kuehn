/**
 * Hilfen für Fall bearbeiten. Keine Rechnung: nur Zugriff auf die Fall-Datei und
 * Zuordnung von API-Antworten (Prüfmeldungen, Rechenweg) zu Zeilen.
 */

import type { FallDatei, Meldung, ModellErgebnis, Schritt } from "@/lib/api";

export type Herkunft = "L" | "A" | "N";

export type Feld = {
  name: string;
  bezeichnung: string;
  wert: number | null;
  einheit: string;
  herkunft: Herkunft;
  quelle: string;
  spanne: [number, number] | null;
  gruppe: string;
  text?: string;
};

export type Hilfsgroesse = {
  name: string;
  bezeichnung: string;
  formel: string;
  einheit: string;
  gruppe: string;
};

export type Position = {
  dimension: "oekon" | "oekol";
  bezeichnung: string;
  formel: string;
  alternativen: string[];
  gruppe: string;
};

export type Alternative = {
  schluessel: string;
  name: string;
  art: string;
  aktiv: boolean;
};

export type Unterkriterium = {
  schluessel: string;
  name: string;
  gewicht: number;
  stufen: Record<string, number>;
  ableitung: string | null;
};

export type Stammdaten = {
  bauteil: string;
  werkstoff: string;
  werkstoffklasse: string;
  schadenstyp: string;
  schadensgrad: string;
};

export type Gate = {
  bauteil_aufbereitbar: boolean;
  ersatzbedarf: boolean;
  neuteil_verfuegbar: boolean;
};

export type Gewichte = { tech: number; oekon: number; oekol: number };

export type FeldUrsprung = {
  wert: number | null;
  herkunft: Herkunft;
  quelle: string;
};

type ModellRoh = {
  name?: string;
  beschreibung?: string;
  stammdaten?: Stammdaten;
  gate?: Gate;
  felder?: Feld[];
  hilfsgroessen?: Hilfsgroesse[];
  positionen?: Position[];
  alternativen?: Alternative[];
  unterkriterien?: Unterkriterium[];
  gewichte?: Gewichte;
  bausteine?: { strafe_max?: string };
  werkstoffklassen?: string[];
  eignung?: Record<string, number[]>;
  schadensgrad_score?: Record<string, number>;
  s_tech_ohne_verfahren?: number;
};

export function modellAusDatei(datei: FallDatei): ModellRoh {
  return (datei.modell as ModellRoh) ?? {};
}

export function fallName(datei: FallDatei): string {
  return modellAusDatei(datei).name ?? "";
}

export function fallBeschreibung(datei: FallDatei): string {
  return modellAusDatei(datei).beschreibung ?? "";
}

export function stammdaten(datei: FallDatei): Stammdaten {
  return (
    modellAusDatei(datei).stammdaten ?? {
      bauteil: "",
      werkstoff: "",
      werkstoffklasse: "",
      schadenstyp: "",
      schadensgrad: "",
    }
  );
}

export function gate(datei: FallDatei): Gate {
  return (
    modellAusDatei(datei).gate ?? {
      bauteil_aufbereitbar: true,
      ersatzbedarf: true,
      neuteil_verfuegbar: true,
    }
  );
}

export function werkstoffklassen(datei: FallDatei): string[] {
  return modellAusDatei(datei).werkstoffklassen ?? [];
}

export function eignung(datei: FallDatei): Record<string, number[]> {
  return modellAusDatei(datei).eignung ?? {};
}

export function schadensgradScore(datei: FallDatei): Record<string, number> {
  return modellAusDatei(datei).schadensgrad_score ?? {};
}

export function sTechOhneVerfahren(datei: FallDatei): number {
  return modellAusDatei(datei).s_tech_ohne_verfahren ?? 5.0;
}

export function felder(datei: FallDatei): Feld[] {
  return modellAusDatei(datei).felder ?? [];
}

export function hilfsgroessen(datei: FallDatei): Hilfsgroesse[] {
  return modellAusDatei(datei).hilfsgroessen ?? [];
}

export function positionen(datei: FallDatei): Position[] {
  return modellAusDatei(datei).positionen ?? [];
}

export function alternativen(datei: FallDatei): Alternative[] {
  return modellAusDatei(datei).alternativen ?? [];
}

export function unterkriterien(datei: FallDatei): Unterkriterium[] {
  return modellAusDatei(datei).unterkriterien ?? [];
}

/** Alternativen mit technischer Bewertung (Wiederaufbereitung oder sonstige). */
export function technikAlternativen(datei: FallDatei): Alternative[] {
  return alternativen(datei).filter(
    (a) => a.art === "aufbereitung" || a.art === "sonstige"
  );
}

export function gewichte(datei: FallDatei): Gewichte {
  return modellAusDatei(datei).gewichte ?? { tech: 1 / 3, oekon: 1 / 3, oekol: 1 / 3 };
}

export function strafeMaxName(datei: FallDatei): string {
  return (modellAusDatei(datei).bausteine?.strafe_max ?? "").trim();
}

/** Snapshot der Felder beim Laden (Herkunft zurücksetzen bei Ursprungswert). */
export function ursprungAusDatei(datei: FallDatei): Record<string, FeldUrsprung> {
  const aus: Record<string, FeldUrsprung> = {};
  for (const f of felder(datei)) {
    aus[f.name] = { wert: f.wert, herkunft: f.herkunft, quelle: f.quelle };
  }
  return aus;
}

export function herkunftNachAenderung(
  ursprung: Record<string, FeldUrsprung>,
  name: string,
  neuerWert: number | null,
  bisher: Feld
): { herkunft: Herkunft; quelle: string } {
  const ur = ursprung[name];
  if (ur && neuerWert === ur.wert) {
    return { herkunft: ur.herkunft, quelle: ur.quelle };
  }
  if (neuerWert === bisher.wert) {
    return { herkunft: bisher.herkunft, quelle: bisher.quelle };
  }
  return { herkunft: "N", quelle: bisher.quelle };
}

/** Fall-Datei mit geänderten Feldern (immutable). */
export function mitModell(
  datei: FallDatei,
  aenderung: (m: Record<string, unknown>) => Record<string, unknown>
): FallDatei {
  const modell = { ...((datei.modell as Record<string, unknown>) ?? {}) };
  return { ...datei, modell: aenderung(modell) };
}

export function setzeFallKopf(
  datei: FallDatei,
  patch: { name?: string; beschreibung?: string }
): FallDatei {
  return mitModell(datei, (m) => ({ ...m, ...patch }));
}

export function setzeStammdaten(
  datei: FallDatei,
  patch: Partial<Stammdaten>
): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    stammdaten: { ...(m.stammdaten as Stammdaten), ...patch },
  }));
}

export function setzeGate(datei: FallDatei, patch: Partial<Gate>): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    gate: { ...(m.gate as Gate), ...patch },
  }));
}

export function setzeEignungZeile(
  datei: FallDatei,
  schadenstyp: string,
  werte: number[]
): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    eignung: { ...((m.eignung as Record<string, number[]>) ?? {}), [schadenstyp]: werte },
  }));
}

export function neueEignungZeile(
  datei: FallDatei,
  schadenstyp: string,
  werte?: number[]
): FallDatei {
  const klassen = werkstoffklassen(datei);
  const stufen = werte ?? klassen.map(() => 3);
  return setzeEignungZeile(datei, schadenstyp, stufen);
}

export function loescheEignungZeile(datei: FallDatei, schadenstyp: string): FallDatei {
  const stamm = stammdaten(datei);
  if (stamm.schadenstyp === schadenstyp) return datei;
  return mitModell(datei, (m) => {
    const tab = { ...((m.eignung as Record<string, number[]>) ?? {}) };
    delete tab[schadenstyp];
    return { ...m, eignung: tab };
  });
}

export function benenneSchadenstyp(
  datei: FallDatei,
  alt: string,
  neu: string
): FallDatei {
  if (!neu.trim() || alt === neu) return datei;
  return mitModell(datei, (m) => {
    const tab = { ...((m.eignung as Record<string, number[]>) ?? {}) };
    if (!(alt in tab) || neu in tab) return m;
    tab[neu] = tab[alt];
    delete tab[alt];
    const stamm = { ...(m.stammdaten as Stammdaten) };
    if (stamm.schadenstyp === alt) stamm.schadenstyp = neu;
    return { ...m, eignung: tab, stammdaten: stamm };
  });
}

export function setzeSchadensgradZeile(
  datei: FallDatei,
  grad: string,
  stufe: number
): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    schadensgrad_score: {
      ...((m.schadensgrad_score as Record<string, number>) ?? {}),
      [grad]: stufe,
    },
  }));
}

export function neueSchadensgradZeile(
  datei: FallDatei,
  grad: string,
  stufe = 3
): FallDatei {
  return setzeSchadensgradZeile(datei, grad, stufe);
}

export function loescheSchadensgradZeile(datei: FallDatei, grad: string): FallDatei {
  const stamm = stammdaten(datei);
  if (stamm.schadensgrad === grad) return datei;
  return mitModell(datei, (m) => {
    const tab = { ...((m.schadensgrad_score as Record<string, number>) ?? {}) };
    delete tab[grad];
    return { ...m, schadensgrad_score: tab };
  });
}

export function benenneSchadensgrad(
  datei: FallDatei,
  alt: string,
  neu: string
): FallDatei {
  if (!neu.trim() || alt === neu) return datei;
  return mitModell(datei, (m) => {
    const tab = { ...((m.schadensgrad_score as Record<string, number>) ?? {}) };
    if (!(alt in tab) || neu in tab) return m;
    tab[neu] = tab[alt];
    delete tab[alt];
    const stamm = { ...(m.stammdaten as Stammdaten) };
    if (stamm.schadensgrad === alt) stamm.schadensgrad = neu;
    return { ...m, schadensgrad_score: tab, stammdaten: stamm };
  });
}

export function setzeFeldwert(
  datei: FallDatei,
  name: string,
  wert: number | null,
  ursprung: Record<string, FeldUrsprung>
): FallDatei {
  return mitModell(datei, (m) => {
    const liste = [...((m.felder as Feld[]) ?? [])];
    const i = liste.findIndex((f) => f.name === name);
    if (i < 0) return m;
    const bisher = liste[i];
    if (wert === bisher.wert) return m;
    const { herkunft, quelle } = herkunftNachAenderung(ursprung, name, wert, bisher);
    liste[i] = { ...bisher, wert, herkunft, quelle };
    return { ...m, felder: liste };
  });
}

export function setzeFeld(
  datei: FallDatei,
  name: string,
  patch: Partial<Feld>
): FallDatei {
  return mitModell(datei, (m) => {
    const liste = [...((m.felder as Feld[]) ?? [])];
    const i = liste.findIndex((f) => f.name === name);
    if (i < 0) return m;
    liste[i] = { ...liste[i], ...patch };
    return { ...m, felder: liste };
  });
}

export function neuesFeld(datei: FallDatei, feld: Feld): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    felder: [...((m.felder as Feld[]) ?? []), feld],
  }));
}

export function loescheFeld(datei: FallDatei, name: string): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    felder: ((m.felder as Feld[]) ?? []).filter((f) => f.name !== name),
  }));
}

export function setzePosition(
  datei: FallDatei,
  index: number,
  patch: Partial<Position>
): FallDatei {
  return mitModell(datei, (m) => {
    const liste = [...((m.positionen as Position[]) ?? [])];
    if (index < 0 || index >= liste.length) return m;
    liste[index] = { ...liste[index], ...patch };
    return { ...m, positionen: liste };
  });
}

export function neuePosition(datei: FallDatei, p: Position): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    positionen: [...((m.positionen as Position[]) ?? []), p],
  }));
}

export function loeschePosition(datei: FallDatei, index: number): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    positionen: ((m.positionen as Position[]) ?? []).filter((_, i) => i !== index),
  }));
}

export function setzeHilfsgroesse(
  datei: FallDatei,
  index: number,
  patch: Partial<Hilfsgroesse>
): FallDatei {
  return mitModell(datei, (m) => {
    const liste = [...((m.hilfsgroessen as Hilfsgroesse[]) ?? [])];
    if (index < 0 || index >= liste.length) return m;
    liste[index] = { ...liste[index], ...patch };
    return { ...m, hilfsgroessen: liste };
  });
}

export function neueHilfsgroesse(datei: FallDatei, h: Hilfsgroesse): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    hilfsgroessen: [...((m.hilfsgroessen as Hilfsgroesse[]) ?? []), h],
  }));
}

export function loescheHilfsgroesse(datei: FallDatei, index: number): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    hilfsgroessen: ((m.hilfsgroessen as Hilfsgroesse[]) ?? []).filter((_, i) => i !== index),
  }));
}

export function setzeGewichte(datei: FallDatei, g: Gewichte): FallDatei {
  return mitModell(datei, (m) => ({ ...m, gewichte: g }));
}

export function setzeUnterkriteriumGewicht(
  datei: FallDatei,
  schluessel: string,
  gewicht: number
): FallDatei {
  return mitModell(datei, (m) => {
    const liste = [...((m.unterkriterien as Unterkriterium[]) ?? [])];
    const i = liste.findIndex((u) => u.schluessel === schluessel);
    if (i < 0) return m;
    liste[i] = { ...liste[i], gewicht };
    return { ...m, unterkriterien: liste };
  });
}

export function setzeStufe(
  datei: FallDatei,
  ukSchluessel: string,
  altSchluessel: string,
  stufe: number
): FallDatei {
  return mitModell(datei, (m) => {
    const liste = [...((m.unterkriterien as Unterkriterium[]) ?? [])];
    const i = liste.findIndex((u) => u.schluessel === ukSchluessel);
    if (i < 0) return m;
    const uk = liste[i];
    if (uk.ableitung) return m;
    liste[i] = {
      ...uk,
      stufen: { ...uk.stufen, [altSchluessel]: stufe },
    };
    return { ...m, unterkriterien: liste };
  });
}

export function setzeUnterkriterium(
  datei: FallDatei,
  schluessel: string,
  patch: Partial<Unterkriterium>
): FallDatei {
  return mitModell(datei, (m) => {
    const liste = [...((m.unterkriterien as Unterkriterium[]) ?? [])];
    const i = liste.findIndex((u) => u.schluessel === schluessel);
    if (i < 0) return m;
    const bisher = liste[i];
    const neu = { ...bisher, ...patch };
    if (patch.ableitung !== undefined && patch.ableitung) {
      neu.stufen = {};
    }
    liste[i] = neu;
    return { ...m, unterkriterien: liste };
  });
}

export function neuesUnterkriterium(
  datei: FallDatei,
  uk: Unterkriterium
): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    unterkriterien: [...((m.unterkriterien as Unterkriterium[]) ?? []), uk],
  }));
}

export function loescheUnterkriterium(
  datei: FallDatei,
  schluessel: string
): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    unterkriterien: ((m.unterkriterien as Unterkriterium[]) ?? []).filter(
      (u) => u.schluessel !== schluessel
    ),
  }));
}

/** Konvention 4.3.1: Neuteil/Ausscheiden Höchstwert (5) oder unterste Stufe (1). */
export function setzeKonvention(datei: FallDatei, hoechstwert: boolean): FallDatei {
  return mitModell(datei, (m) => ({
    ...m,
    s_tech_ohne_verfahren: hoechstwert ? 5.0 : 1.0,
  }));
}

/**
 * Stufen der abgeleiteten Unterkriterien aus dem Ergebnis (Zuordnung, keine Rechnung).
 * Entspricht app/seiten/bearbeiten.py `_abgeleitet`.
 */
export function abgeleiteteStufen(
  datei: FallDatei,
  ergebnis: ModellErgebnis | null
): Record<string, number> {
  if (!ergebnis) return {};
  const uks = unterkriterien(datei);
  for (const stufen of Object.values(ergebnis.unterkriterien)) {
    if (stufen) {
      const aus: Record<string, number> = {};
      for (const u of uks) {
        if (u.ableitung && u.schluessel in stufen) {
          aus[u.ableitung] = stufen[u.schluessel];
        }
      }
      return aus;
    }
  }
  return {};
}

export function meldungenJeOrt(meldungen: Meldung[]): Record<string, Meldung[]> {
  const aus: Record<string, Meldung[]> = {};
  for (const m of meldungen) {
    (aus[m.ort] ??= []).push(m);
  }
  return aus;
}

export type PositionsErgebnis = {
  bezeichnung: string;
  formel: string;
  alternative: string | null;
  einheit: string;
  ergebnis: number;
};

export type HilfsErgebnis = {
  bezeichnung: string;
  formel: string;
  ergebnis: number;
  einheit: string;
};

/** Ergebnisse je Position/Hilfsgröße aus dem Rechenweg (Zuordnung, keine Rechnung). */
export function ergebnisseAusRechenweg(rechenweg: Schritt[]): {
  positionen: Map<string, number>;
  hilfsgroessen: Map<string, HilfsErgebnis>;
  austauschrate: number | null;
} {
  const positionen = new Map<string, number>();
  const hilfsgroessen = new Map<string, HilfsErgebnis>();
  let austauschrate: number | null = null;
  for (const s of rechenweg) {
    if (s.bereich === "position") {
      const key = `${s.bezeichnung}|${s.formel}|${s.alternative ?? ""}|${s.einheit}`;
      positionen.set(key, s.ergebnis);
    } else if (s.bereich === "hilfsgroesse") {
      hilfsgroessen.set(`${s.bezeichnung}|${s.formel}`, {
        bezeichnung: s.bezeichnung,
        formel: s.formel,
        ergebnis: s.ergebnis,
        einheit: s.einheit,
      });
    } else if (s.bereich === "austauschrate") {
      austauschrate = s.ergebnis;
    }
  }
  return { positionen, hilfsgroessen, austauschrate };
}

export function positionsErgebnisKey(
  bezeichnung: string,
  formel: string,
  alternative: string,
  einheit: string
): string {
  return `${bezeichnung}|${formel}|${alternative}|${einheit}`;
}

export function einheitDimension(dimension: "oekon" | "oekol"): string {
  return dimension === "oekon" ? "€" : "kg CO₂-Äq";
}

export function fehlerVorhanden(meldungen: Meldung[]): boolean {
  return meldungen.some((m) => m.stufe === "fehler");
}

export function hatErgebnis(e: ModellErgebnis | null): e is ModellErgebnis {
  return e !== null;
}

export const DIMENSION_TEXT: Record<"oekon" | "oekol", string> = {
  oekon: "ökonomisch",
  oekol: "ökologisch",
};

export const GEWICHT_TEXT: Record<keyof Gewichte, string> = {
  tech: "Technische Dimension",
  oekon: "Ökonomische Dimension",
  oekol: "Ökologische Dimension",
};
