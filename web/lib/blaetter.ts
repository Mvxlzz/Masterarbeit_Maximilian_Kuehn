/**
 * Hilfen für die Formel- und Datenblätter und den Export. Keine Rechnung: Zeilen der Fall-Datei zählen,
 * gruppieren und filtern, Dateinamen bilden und Dateien herunterladen.
 */

import type { Feld } from "@/lib/fall";

export type HerkunftZaehler = {
  gesamt: number;
  L: number;
  A: number;
  N: number;
  mitSpanne: number;
};

/** Anzahl der Felder je Herkunft und mit Spanne (Zählen von Zeilen, keine Rechnung über Kennzahlen). */
export function herkunftZaehlen(felder: Feld[]): HerkunftZaehler {
  const z: HerkunftZaehler = { gesamt: felder.length, L: 0, A: 0, N: 0, mitSpanne: 0 };
  for (const f of felder) {
    if (f.herkunft === "L" || f.herkunft === "A" || f.herkunft === "N") z[f.herkunft] += 1;
    if (f.spanne) z.mitSpanne += 1;
  }
  return z;
}

export type FeldGruppe = { gruppe: string; felder: Feld[] };

/** Felder nach Gruppe in der Reihenfolge des ersten Auftretens; Suche über Name, Bezeichnung, Quelle und Gruppe. */
export function felderNachGruppe(felder: Feld[], suche = ""): FeldGruppe[] {
  const s = suche.trim().toLowerCase();
  const passt = (f: Feld) =>
    !s ||
    [f.name, f.bezeichnung, f.quelle, f.gruppe].some((t) => (t ?? "").toLowerCase().includes(s));
  const gruppen = new Map<string, Feld[]>();
  for (const f of felder) {
    if (!passt(f)) continue;
    const g = f.gruppe || "Ohne Gruppe";
    if (!gruppen.has(g)) gruppen.set(g, []);
    gruppen.get(g)!.push(f);
  }
  return [...gruppen].map(([gruppe, liste]) => ({ gruppe, felder: liste }));
}

/** Dateiname aus dem Projektnamen, z. B. „Kurbelwelle_Nfz-Dieselmotor_felder.csv“. */
export function dateiname(projektname: string, teil: string | null, endung = "csv"): string {
  const stamm = projektname.replace(/[^\w-]+/g, "_");
  return `${teil ? `${stamm}_${teil}` : stamm}.${endung}`;
}

/**
 * Lädt eine Datei im Browser herunter. Die Blob-URL wird erst nach dem Klick freigegeben, sonst ist die Datei in
 * Chromium leer.
 */
export function herunterladen(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
