/**
 * Projekte im Browser (Gastmodus): Ein Projekt ist eine Fall-Datei mit Namen und Beschreibung.
 * Persistiert in localStorage, kein Server. Rechnet nichts, ruft nur lib/api.ts auf.
 */
import type { FallDatei } from "./api";

export const SCHLUESSEL_PROJEKTE = "w3-projekte";
export const SCHLUESSEL_OFFEN = "w3-offen";
export const REFERENZ_ID = "referenz";
/** Szenario-Wahl je Konto-Projekt: nur die Wahl liegt im Browser, das Projekt selbst im Konto. */
export const SCHLUESSEL_KONTO_SZENARIO = "w11-szenario";
/** Präfix der IDs von Konto-Projekten im Browser: `k:<id in cases>`. */
export const KONTO_PRAEFIX = "k:";

export type Grundlage = "referenz" | "vorlage" | "import";

export type FeldUrsprungEintrag = {
  wert: number | null;
  herkunft: "L" | "A" | "N";
  quelle: string;
};

export type Projekt = {
  id: string;
  name: string;
  beschreibung: string;
  grundlage: Grundlage;
  /** Zur Anzeige, welche Vorlage gewählt wurde (kein Teil des API-Vertrags). */
  basis?: "leer" | "kopie";
  datei?: FallDatei;
  /** Snapshot der Feldwerte beim ersten Laden (Herkunft zurücksetzen). */
  ursprung?: Record<string, FeldUrsprungEintrag>;
  geaendert: string;
  nutzwertRang1?: number;
  rang1Name?: string;
  referenz?: boolean;
  /**
   * Aktives Szenario: Schlüssel eines Szenarios, `null` für den Basisfall, fehlt = Standard
   * (S0, wenn vorhanden, sonst Basisfall). Gilt für Ergebnis, Sensitivität und die Bausteinwerte.
   */
  szenario?: string | null;
  /** Speicherort: fehlt = dieser Browser, `"konto"` = Tabelle `cases` im Konto. */
  ort?: "konto";
  /** ID der Zeile in `cases` (nur bei Konto-Projekten). */
  kontoId?: string;
};

export function istKontoId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(KONTO_PRAEFIX);
}

export type SzenarioKurz = { schluessel: string; name: string };

/** Szenarien der Fall-Datei in ihrer Reihenfolge (nur Schlüssel und Name). */
export function szenarienKurz(datei: FallDatei | null | undefined): SzenarioKurz[] {
  const modell = (datei?.modell as { szenarien?: SzenarioKurz[] } | undefined) ?? {};
  return (modell.szenarien ?? []).map((s) => ({ schluessel: s.schluessel, name: s.name }));
}

/**
 * Aktives Szenario eines Projekts: gespeicherte Wahl, wenn es das Szenario noch gibt; sonst Basisfall.
 * Ohne gespeicherte Wahl S0, wenn vorhanden, sonst Basisfall (`null`).
 */
export function aktivesSzenario(
  wahl: string | null | undefined,
  datei: FallDatei | null | undefined
): string | null {
  const liste = szenarienKurz(datei);
  if (wahl === null) return null;
  if (wahl === undefined) return liste.some((s) => s.schluessel === "S0") ? "S0" : null;
  return liste.some((s) => s.schluessel === wahl) ? wahl : null;
}

/** Anzeigename einer Alternative aus der Fall-Datei (nie im Code ausschreiben); ohne Datei der Schlüssel. */
export function alternativName(datei: FallDatei | null | undefined, schluessel: string): string {
  const modell = (datei?.modell as { alternativen?: { schluessel: string; name: string }[] } | undefined) ?? {};
  return modell.alternativen?.find((a) => a.schluessel === schluessel)?.name ?? schluessel;
}

/** Anzeige des Szenarios in Pfad und Seitenkopf: „S5 · Ausschussrisiko und Verzug“ oder „Basisfall“. */
export function szenarioTitel(
  schluessel: string | null,
  datei: FallDatei | null | undefined
): string {
  if (schluessel === null) return "Basisfall";
  const s = szenarienKurz(datei).find((x) => x.schluessel === schluessel);
  return s ? `${s.schluessel} · ${s.name}` : schluessel;
}

/** Zeitpunkt der letzten Änderung als ISO-Zeitstempel (ältere Projekte im Browser haben nur das Datum). */
function heute(): string {
  return new Date().toISOString();
}

/** Stand der Referenzdatei `daten/referenzmodell.json` (ändert sich nie in der App). */
export const REFERENZ_STAND = "2026-09-28";

function datumDe(t: Date): string {
  return t.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Text der Pille auf der Projektkachel: „Geändert heute, 14:05“, „Geändert 28.09.2026, 09:12“ oder bei reinem Datum
 * „Geändert 28.09.2026“. Die Referenz zeigt „Stand 28.09.2026“.
 */
export function geaendertText(p: Pick<Projekt, "geaendert" | "referenz">, jetzt: Date = new Date()): string {
  if (p.referenz) {
    const [j, m, t] = REFERENZ_STAND.split("-");
    return `Stand ${t}.${m}.${j}`;
  }
  const nurDatum = /^\d{4}-\d{2}-\d{2}$/.test(p.geaendert);
  if (nurDatum) {
    const [j, m, t] = p.geaendert.split("-");
    return `Geändert ${t}.${m}.${j}`;
  }
  const t = new Date(p.geaendert);
  if (Number.isNaN(t.getTime())) return "Geändert";
  const zeit = t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const tag = datumDe(t) === datumDe(jetzt) ? "heute" : datumDe(t);
  return `Geändert ${tag}, ${zeit}`;
}

function neueId(): string {
  return `p${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function referenzProjekt(): Projekt {
  return {
    id: REFERENZ_ID,
    name: "Kurbelwelle Nfz-Dieselmotor",
    beschreibung:
      "Sechszylinder-Nutzfahrzeugdieselmotor, 42CrMo4, 103 kg. Verschleiß an den Hauptlagerstellen, mittlerer Schadensgrad.",
    grundlage: "referenz",
    referenz: true,
    geaendert: REFERENZ_STAND,
  };
}

function istBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Liest alle Projekte, legt beim ersten Aufruf das Referenzprojekt an. */
export function leseProjekte(): Projekt[] {
  if (!istBrowser()) return [referenzProjekt()];
  try {
    const roh = localStorage.getItem(SCHLUESSEL_PROJEKTE);
    if (!roh) return [referenzProjekt()];
    const liste = JSON.parse(roh) as Projekt[];
    if (!Array.isArray(liste) || !liste.some((p) => p.id === REFERENZ_ID)) {
      return [referenzProjekt(), ...(Array.isArray(liste) ? liste : [])];
    }
    return liste;
  } catch {
    return [referenzProjekt()];
  }
}

export function schreibeProjekte(liste: Projekt[]): void {
  if (!istBrowser()) return;
  try {
    // Konto-Projekte nie in den Browser schreiben (gemeinsam genutzte Rechner), nur Projekte dieses Browsers.
    const lokal = liste.filter((p) => p.ort !== "konto" && !istKontoId(p.id));
    localStorage.setItem(SCHLUESSEL_PROJEKTE, JSON.stringify(lokal));
  } catch {
    // Gastmodus ohne Speicher (z. B. privater Modus): Projekte bleiben nur für die Sitzung erhalten.
  }
}

export function leseOffenId(): string | null {
  if (!istBrowser()) return null;
  try {
    return localStorage.getItem(SCHLUESSEL_OFFEN);
  } catch {
    return null;
  }
}

export function schreibeOffenId(id: string | null): void {
  if (!istBrowser()) return;
  try {
    if (id === null) localStorage.removeItem(SCHLUESSEL_OFFEN);
    else localStorage.setItem(SCHLUESSEL_OFFEN, id);
  } catch {
    // ignorieren
  }
}

/** Szenario-Wahl je Konto-Projekt (`id in cases → Schlüssel`, `null` = Basisfall). */
export function leseKontoSzenarien(): Record<string, string | null> {
  if (!istBrowser()) return {};
  try {
    const roh = localStorage.getItem(SCHLUESSEL_KONTO_SZENARIO);
    const wert = roh ? JSON.parse(roh) : {};
    return wert && typeof wert === "object" && !Array.isArray(wert) ? wert : {};
  } catch {
    return {};
  }
}

export function schreibeKontoSzenario(kontoId: string, szenario: string | null | undefined): void {
  if (!istBrowser()) return;
  try {
    const alle = leseKontoSzenarien();
    if (szenario === undefined) delete alle[kontoId];
    else alle[kontoId] = szenario;
    localStorage.setItem(SCHLUESSEL_KONTO_SZENARIO, JSON.stringify(alle));
  } catch {
    // ignorieren
  }
}

export function neuesProjekt(
  name: string,
  beschreibung: string,
  grundlage: Grundlage,
  basis?: "leer" | "kopie"
): Projekt {
  return {
    id: neueId(),
    name,
    beschreibung,
    grundlage,
    basis,
    geaendert: heute(),
  };
}

export function heuteIso(): string {
  return heute();
}
