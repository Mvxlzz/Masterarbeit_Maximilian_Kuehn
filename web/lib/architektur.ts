/**
 * Inhalt des Architekturdiagramms: Gruppen, Bausteine, Zeilen und Verbindungen. Nur Text und Lage, keine
 * Zahlen: Das Diagramm stellt dar, gerechnet wird ausschließlich in `kern/`. Dieselben Daten zeichnen die Seite
 * `/architektur` und die Abbildung für Kapitel 5 (`/architektur/abbildung`), damit beide übereinstimmen.
 */

export type Zeile = {
  id: string;
  text: string;
  /** Art rechts in Mono, z. B. `GET`, `.py`, `(10)`. */
  art?: string;
  /** ◆ zentraler Teil, sonst ◇ unterstützend. */
  zentral?: boolean;
};

export type Symbol =
  | "seiten"
  | "querschnitt"
  | "endpunkte"
  | "vertrag"
  | "modell"
  | "auswertung"
  | "sensitivitaet"
  | "datei"
  | "referenz"
  | "arbeit"
  | "konten";

export type Baustein = {
  id: string;
  gruppe?: string;
  titel: string;
  symbol: Symbol;
  zeilen: Zeile[];
  /** Lage relativ zur Gruppe (oder absolut ohne Gruppe). */
  x: number;
  y: number;
  breite: number;
  /** Kern der Methode: in der App in Markenfarbe, in der Abbildung mit kräftigerem Rand. */
  hervorgehoben?: boolean;
  /** Nicht Teil der Arbeit (Konten): gestrichelt und nur auf der Website. */
  optional?: boolean;
  /** Lage der Griffe oben und unten als Anteil der Breite (Standard Mitte). */
  griff?: number;
  erklaerung: {
    zweck: string;
    dateien: string[];
    formeln?: string;
    link?: { href: string; text: string };
  };
};

export type Gruppe = {
  id: string;
  titel: string;
  zusatz: string;
  y: number;
  breite: number;
  hoehe: number;
  /** durchgezogen (Kern), gestrichelt (Standard) oder gepunktet (Absicherung). */
  rand: "kern" | "gestrichelt" | "gepunktet";
};

export type Verbindung = {
  id: string;
  von: string;
  vonGriff: string;
  nach: string;
  nachGriff: string;
  text?: string;
  /** Pfeil an beiden Enden. */
  beidseitig?: boolean;
  gestrichelt?: boolean;
  optional?: boolean;
};

export const ZEILE_HOEHE = 30;
export const KOPF_HOEHE = 42;
export const BREITE = 1160;
const INNEN = 24;
const GRUPPE_KOPF = 44;
const ABSTAND = 124;

export function bausteinHoehe(b: Pick<Baustein, "zeilen">): number {
  return KOPF_HOEHE + b.zeilen.length * ZEILE_HOEHE;
}

// ---------------------------------------------------------------- Bausteine (Lage relativ zur Gruppe)

const SEITEN: Baustein = {
  id: "seiten",
  gruppe: "oberflaeche",
  titel: "Seiten",
  symbol: "seiten",
  x: INNEN,
  y: GRUPPE_KOPF,
  breite: 300,
  zeilen: [
    { id: "projekte", text: "Projekte", art: "/projekte", zentral: true },
    { id: "einfuehrung", text: "Einführung", art: "/einfuehrung" },
    { id: "fall", text: "Fall bearbeiten", art: "/fall", zentral: true },
    { id: "ergebnis", text: "Ergebnis", art: "/ergebnis", zentral: true },
    { id: "sensitivitaet", text: "Sensitivität", art: "/sensitivitaet", zentral: true },
    { id: "szenarien", text: "Szenarien", art: "/szenarien" },
    { id: "blaetter", text: "Formel- und Datenblätter", art: "/blaetter" },
  ],
  erklaerung: {
    zweck:
      "Sieben Bereiche mit Projekt und Szenario im Pfad. Jede Eingabe zeigt ihre Herkunft (L, A, N) mit Quelle und Spanne. Die Seiten zeigen an und formatieren, sie rechnen nicht.",
    dateien: ["web/app/", "web/components/"],
    link: { href: "/projekte", text: "Zu den Projekten" },
  },
};

const QUERSCHNITT: Baustein = {
  id: "querschnitt",
  gruppe: "oberflaeche",
  titel: "Querschnitt",
  symbol: "querschnitt",
  x: INNEN + 300 + 24,
  y: GRUPPE_KOPF,
  breite: 300,
  zeilen: [
    { id: "client", text: "Aufrufe der Schnittstelle", art: "api.ts", zentral: true },
    { id: "typen", text: "Datenvertrag als Typen", art: ".ts" },
    { id: "diagramme", text: "Diagramme (Recharts, SVG)", art: ".tsx" },
    { id: "katex", text: "Rechenweg im Formelsatz", art: "KaTeX" },
    { id: "format", text: "Zahlen im deutschen Format", art: "format.ts" },
    { id: "speicher", text: "Projekte im Browser oder Konto", art: ".ts" },
  ],
  erklaerung: {
    zweck:
      "Gemeinsame Teile aller Seiten. Die Aufrufe der Schnittstelle schicken die Fall-Datei als JSON und bekommen Ergebnis und Rechenweg zurück. Formeln erscheinen als LaTeX aus dem Kern, die Oberfläche setzt sie nur.",
    dateien: ["web/lib/api.ts", "web/lib/format.ts", "web/components/katex.tsx", "web/lib/projekte.ts"],
  },
};

const KONTEN: Baustein = {
  id: "konten",
  titel: "Konten (optional)",
  symbol: "konten",
  x: 812,
  y: GRUPPE_KOPF,
  breite: 300,
  optional: true,
  zeilen: [
    { id: "anmeldung", text: "Anmeldung mit E-Mail", art: "Auth" },
    { id: "cases", text: "Projekte als Fall-Datei", art: "jsonb" },
    { id: "rls", text: "Zeilenschutz je Konto", art: "RLS" },
  ],
  erklaerung: {
    zweck:
      "Nur mit Anmeldung: Projekte liegen dann in einer Datenbank (Supabase, EU) statt im Browser. Gespeichert wird die unveränderte Fall-Datei, Ergebnisse werden beim Öffnen neu berechnet. Nicht Teil der Arbeit.",
    dateien: ["web/lib/konto.ts", "web/components/konto-provider.tsx"],
    link: { href: "/projekte", text: "Zu den Projekten" },
  },
};

const API_X = [INNEN, INNEN + 280, INNEN + 560, INNEN + 840];

const FALL_ENDPUNKTE: Baustein = {
  id: "fall-endpunkte",
  gruppe: "api",
  titel: "Fall und Prüfung",
  symbol: "endpunkte",
  x: API_X[0],
  y: GRUPPE_KOPF,
  breite: 256,
  zeilen: [
    { id: "referenzmodell", text: "/referenzmodell", art: "GET", zentral: true },
    { id: "vorlage", text: "/vorlage", art: "GET" },
    { id: "katalog", text: "/katalog", art: "GET" },
    { id: "pruefen", text: "/pruefen", art: "POST", zentral: true },
    { id: "alternativen", text: "/alternativen", art: "POST" },
    { id: "gewichte-dimension", text: "/gewichte/dimension", art: "POST" },
    { id: "gewichte-kostensatz", text: "/gewichte/kostensatz", art: "POST" },
  ],
  erklaerung: {
    zweck:
      "Liefert Referenzfall und leere Vorlage, prüft eine Fall-Datei und meldet Fehler an der Zeile. Umrechnungen wie Gewichte oder das Umbenennen von Alternativen erledigt der Kern.",
    dateien: ["api/main.py"],
  },
};

const BEWERTUNG_ENDPUNKTE: Baustein = {
  id: "bewertung-endpunkte",
  gruppe: "api",
  titel: "Bewertung",
  symbol: "endpunkte",
  x: API_X[1],
  y: GRUPPE_KOPF,
  breite: 256,
  zeilen: [
    { id: "bewerten", text: "/bewerten", art: "POST", zentral: true },
    { id: "szenarien", text: "/szenarien", art: "POST", zentral: true },
    { id: "bausteine", text: "/bausteine", art: "POST" },
  ],
  erklaerung: {
    zweck:
      "Nimmt Fall-Datei und Szenario entgegen und gibt das Ergebnis des Kerns mit Rechenweg zurück: Rangfolge, Gesamtnutzwerte, Beiträge je Dimension und jeden Rechenschritt.",
    dateien: ["api/main.py", "app/rechenweg_latex.py"],
    formeln: "(5), (6), (8) bis (13)",
    link: { href: "/ergebnis", text: "Zum Ergebnis" },
  },
};

const SENSITIVITAET_ENDPUNKTE: Baustein = {
  id: "sensitivitaet-endpunkte",
  gruppe: "api",
  titel: "Sensitivität",
  symbol: "endpunkte",
  x: API_X[2],
  y: GRUPPE_KOPF,
  breite: 256,
  zeilen: [
    { id: "tornado", text: "/tornado", art: "POST", zentral: true },
    { id: "verlauf", text: "/verlauf", art: "POST", zentral: true },
    { id: "kipppunkte", text: "/kipppunkte", art: "POST" },
    { id: "karte", text: "/karte", art: "POST" },
    { id: "dreieck", text: "/dreieck", art: "POST" },
  ],
  erklaerung: {
    zweck:
      "Variiert Eingaben und Gewichte über das Sensitivitätsmodul des Kerns und liefert Tornado, Verlauf mit Kipppunkten, Kipppunkt-Karte und Gewichtsdreieck.",
    dateien: ["api/main.py"],
    link: { href: "/sensitivitaet", text: "Zur Sensitivität" },
  },
};

const INHALTE_ENDPUNKTE: Baustein = {
  id: "inhalte-endpunkte",
  gruppe: "api",
  titel: "Inhalte und Export",
  symbol: "endpunkte",
  x: API_X[3],
  y: GRUPPE_KOPF,
  breite: 272,
  zeilen: [
    { id: "tutorial", text: "/tutorial", art: "GET" },
    { id: "formeln", text: "/formeln", art: "GET" },
    { id: "glossar", text: "/glossar", art: "GET" },
    { id: "latex", text: "/latex", art: "POST" },
    { id: "latex-fall", text: "/latex/fall", art: "POST" },
    { id: "export-felder", text: "/export/felder.csv", art: "POST" },
    { id: "export-ergebnisse", text: "/export/ergebnisse.csv", art: "POST" },
  ],
  erklaerung: {
    zweck:
      "Texte der Einführung, Formeln der Methode, Glossar, Formeln des Falls als LaTeX und die CSV-Dateien für Tabellenprogramme. Auch diese Inhalte entstehen aus dem Kern.",
    dateien: ["api/main.py", "app/export.py", "app/tutorial_daten.py"],
    link: { href: "/blaetter/methode", text: "Zu den Formel- und Datenblättern" },
  },
};

const DATENVERTRAG: Baustein = {
  id: "datenvertrag",
  gruppe: "api",
  titel: "Datenvertrag",
  symbol: "vertrag",
  x: API_X[1],
  y: GRUPPE_KOPF + bausteinHoehe(SENSITIVITAET_ENDPUNKTE) + 24,
  breite: 536,
  zeilen: [
    { id: "schema", text: "Fall-Datei Version 2 (Pydantic)", art: "schema.py", zentral: true },
    { id: "pruefung", text: "prüft jede Anfrage und Antwort", art: "422" },
  ],
  erklaerung: {
    zweck:
      "Beschreibt die Fall-Datei als Pydantic-Modelle. Jede Anfrage wird damit geprüft, Fehler kommen als deutsche Meldung mit Status 422 zurück. Aus derselben Beschreibung entstehen die TypeScript-Typen der Oberfläche.",
    dateien: ["app/schema.py"],
  },
};

const KERN_BREITE = 352;
const KERN_X = [INNEN, INNEN + KERN_BREITE + 28, INNEN + 2 * (KERN_BREITE + 28)];

const FALLMODELL: Baustein = {
  id: "fallmodell",
  gruppe: "kern",
  griff: 0.85,
  titel: "Fallmodell und Formelsprache",
  symbol: "modell",
  x: KERN_X[0],
  y: GRUPPE_KOPF,
  breite: KERN_BREITE,
  zeilen: [
    { id: "modell", text: "modell.py", art: ".py", zentral: true },
    { id: "ausdruck", text: "ausdruck.py", art: ".py", zentral: true },
    { id: "felder", text: "Felder mit Herkunft und Spanne" },
    { id: "positionen", text: "Kosten- und Emissionspositionen" },
    { id: "bausteine", text: "Faktorbausteine", art: "(11)–(13)" },
    { id: "szenarien", text: "Einflussfaktoren und Szenarien" },
  ],
  erklaerung: {
    zweck:
      "Ein Fall besteht aus Feldern, Hilfsgrößen und Positionen, deren Formeln die eigene Formelsprache auswertet (kein eval). Einflussfaktoren ändern Werte oder fügen Zuschläge hinzu, Szenarien kombinieren sie.",
    dateien: ["kern/modell.py", "kern/ausdruck.py"],
    formeln: "(11) bis (13)",
    link: { href: "/fall/datenblatt", text: "Zu „Fall bearbeiten“" },
  },
};

const AUSWERTUNG: Baustein = {
  id: "auswertung",
  gruppe: "kern",
  titel: "Auswertung mit Rechenweg",
  symbol: "auswertung",
  x: KERN_X[1],
  y: GRUPPE_KOPF,
  breite: KERN_BREITE,
  hervorgehoben: true,
  zeilen: [
    { id: "bewerte", text: "bewerte_modell", art: "def", zentral: true },
    { id: "pruefe", text: "pruefe_modell", art: "def", zentral: true },
    { id: "gate", text: "Zulässigkeit (Gate)" },
    { id: "technisch", text: "Technische Dimension", art: "(5), (6)" },
    { id: "oekologisch", text: "Treibhauspotenzial", art: "(8)" },
    { id: "normalisierung", text: "Normalisierung", art: "(9)" },
    { id: "gesamtnutzwert", text: "Gesamtnutzwert", art: "(10)" },
  ],
  erklaerung: {
    zweck:
      "Prüft die Zulässigkeit, berechnet die drei Dimensionen, normalisiert und gewichtet sie zum Gesamtnutzwert. Jeder Schritt wird als Rechenweg mitgeliefert, damit sich jede Zahl bis zu Formel und Feldwerten zurückverfolgen lässt.",
    dateien: ["kern/modell.py"],
    formeln: "(5), (6), (8), (9), (10)",
    link: { href: "/ergebnis", text: "Zum Ergebnis" },
  },
};

const SENSITIVITAETSMODUL: Baustein = {
  id: "sensitivitaetsmodul",
  gruppe: "kern",
  titel: "Sensitivitätsmodul",
  symbol: "sensitivitaet",
  x: KERN_X[2],
  y: GRUPPE_KOPF,
  breite: KERN_BREITE,
  zeilen: [
    { id: "datei", text: "sensitivitaet.py", art: ".py", zentral: true },
    { id: "tornado", text: "Tornado" },
    { id: "verlauf", text: "Verlauf und Kipppunkte" },
    { id: "karte", text: "Kipppunkt-Karte" },
    { id: "dreieck", text: "Gewichtsdreieck" },
  ],
  erklaerung: {
    zweck:
      "Variiert Eingaben und Gewichte und wertet je Variation neu aus. Daraus entstehen die Kipppunkte, an denen sich die Rangfolge ändert.",
    dateien: ["kern/sensitivitaet.py"],
    link: { href: "/sensitivitaet", text: "Zur Sensitivität" },
  },
};

const FALLDATEI: Baustein = {
  id: "falldatei",
  gruppe: "daten",
  griff: 0.85,
  titel: "Falldatei (JSON)",
  symbol: "datei",
  x: KERN_X[0],
  y: GRUPPE_KOPF,
  breite: KERN_BREITE,
  zeilen: [
    { id: "referenz", text: "daten/referenzmodell.json", art: "json", zentral: true },
    { id: "inhalt", text: "Eingaben, Formeln, Faktoren" },
    { id: "szenarien", text: "Szenarien und Quellen" },
  ],
  erklaerung: {
    zweck:
      "Ein Fall als eine Datei: alle Eingaben mit Herkunft, die Formeln, Einflussfaktoren und Szenarien. Austauschformat zwischen Oberfläche, Schnittstelle, Kern und Konto.",
    dateien: ["daten/referenzmodell.json"],
  },
};

const REFERENZIMPLEMENTIERUNG: Baustein = {
  id: "referenzimplementierung",
  gruppe: "daten",
  titel: "Referenzimplementierung",
  symbol: "referenz",
  x: KERN_X[1],
  y: GRUPPE_KOPF,
  breite: KERN_BREITE,
  zeilen: [
    { id: "gate", text: "gate, matching", art: ".py" },
    { id: "dimensionen", text: "technisch, oekonomisch, oekologisch", art: ".py" },
    { id: "faktoren", text: "faktoren, bewertung, parameter", art: ".py" },
  ],
  erklaerung: {
    zweck:
      "Die ursprüngliche Umsetzung der Methode aus Kapitel 4, mit der die Tabellen und Abbildungen der Arbeit gerechnet wurden.",
    dateien: ["kern/gate.py", "kern/matching.py", "kern/technisch.py", "kern/oekonomisch.py", "kern/oekologisch.py"],
  },
};

const KAPITEL4: Baustein = {
  id: "kapitel4",
  gruppe: "daten",
  titel: "Kapitel 4 der Arbeit",
  symbol: "arbeit",
  x: KERN_X[2],
  y: GRUPPE_KOPF,
  breite: KERN_BREITE,
  zeilen: [
    { id: "abschnitte", text: "Abschnitte 4.4 und 4.5", zentral: true },
    { id: "tabellen", text: "Tabellen und Abbildungen" },
  ],
  erklaerung: {
    zweck: "Die Ergebnisse der Arbeit. Die Web-App muss genau diese Zahlen zeigen (91,67 · 82,43 · 33,33 im Referenzfall).",
    dateien: ["daten/referenzmodell.json"],
  },
};

export const BAUSTEINE: Baustein[] = [
  SEITEN,
  QUERSCHNITT,
  KONTEN,
  FALL_ENDPUNKTE,
  BEWERTUNG_ENDPUNKTE,
  SENSITIVITAET_ENDPUNKTE,
  INHALTE_ENDPUNKTE,
  DATENVERTRAG,
  FALLMODELL,
  AUSWERTUNG,
  SENSITIVITAETSMODUL,
  FALLDATEI,
  REFERENZIMPLEMENTIERUNG,
  KAPITEL4,
];

// ---------------------------------------------------------------- Gruppen (Höhe aus den Bausteinen)

function hoeheVon(gruppe: string): number {
  const unten = BAUSTEINE.filter((b) => b.gruppe === gruppe).map((b) => b.y + bausteinHoehe(b));
  return Math.max(...unten) + INNEN;
}

const ROH: Omit<Gruppe, "y" | "hoehe">[] = [
  { id: "oberflaeche", titel: "Oberfläche", zusatz: "web/, Next.js, läuft im Browser, rechnet nichts", breite: 672, rand: "gestrichelt" },
  { id: "api", titel: "Programmierschnittstelle", zusatz: "api/, FastAPI, rechnet nichts, reicht an den Kern weiter", breite: BREITE, rand: "gestrichelt" },
  { id: "kern", titel: "Rechenkern", zusatz: "kern/, einzige Stelle, an der gerechnet wird", breite: BREITE, rand: "kern" },
  { id: "daten", titel: "Daten und Nachweis", zusatz: "", breite: BREITE, rand: "gestrichelt" },
];

export const GRUPPEN: Gruppe[] = (() => {
  let y = 0;
  return ROH.map((g, i) => {
    const hoehe = hoeheVon(g.id);
    const gruppe = { ...g, y, hoehe };
    // Zwischen Daten und Absicherung verläuft keine beschriftete Verbindung, dort genügt ein kleiner Abstand
    y += hoehe + (i === 3 ? 56 : ABSTAND);
    return gruppe;
  });
})();

export const GESAMT_HOEHE = GRUPPEN[GRUPPEN.length - 1].y + GRUPPEN[GRUPPEN.length - 1].hoehe;

// ---------------------------------------------------------------- Verbindungen

export const VERBINDUNGEN: Verbindung[] = [
  { id: "anfrage", von: "oberflaeche", vonGriff: "unten-l", nach: "api", nachGriff: "oben-l", text: "Fall-Datei, Szenario, Variation (JSON)" },
  { id: "antwort", von: "api", vonGriff: "oben-r", nach: "oberflaeche", nachGriff: "unten-r", text: "Ergebnis, Rechenweg, Kipppunkte" },
  { id: "fallmodell", von: "api", vonGriff: "unten-l", nach: "kern", nachGriff: "oben-l", text: "Fallmodell: Felder, Formeln, Gewichte" },
  { id: "ergebnis", von: "kern", vonGriff: "oben-r", nach: "api", nachGriff: "unten-r", text: "Ergebnis-Objekte des Kerns" },
  { id: "modell-auswertung", von: "fallmodell", vonGriff: "rechts", nach: "auswertung", nachGriff: "links" },
  { id: "sensitivitaet-auswertung", von: "sensitivitaetsmodul", vonGriff: "links", nach: "auswertung", nachGriff: "rechts" },
  { id: "laden", von: "falldatei", vonGriff: "oben", nach: "fallmodell", nachGriff: "unten", text: "laden, speichern", beidseitig: true },
  { id: "tabellen", von: "referenzimplementierung", vonGriff: "rechts", nach: "kapitel4", nachGriff: "links" },
  { id: "konten", von: "oberflaeche", vonGriff: "rechts", nach: "konten", nachGriff: "links", text: "laden, speichern", beidseitig: true, gestrichelt: true, optional: true },
];

/** Reihenfolge der Verbindungen beim „Durchlauf zeigen“: Oberfläche → Schnittstelle → Kern → zurück. */
export const DURCHLAUF = ["anfrage", "fallmodell", "modell-auswertung", "ergebnis", "antwort"];

/** Griffe der Gruppen: waagerechte Lage der senkrechten Verbindungen in px, in allen Gruppen gleich (gerade Linien). */
export const GRUPPEN_GRIFFE: Record<"l" | "r", number> = { l: 250, r: 560 };

/** Bausteine und Verbindungen je nach Darstellung (die Abbildung für die Arbeit zeigt keine Konten). */
export function fuerDarstellung(mitOptional: boolean) {
  return {
    bausteine: BAUSTEINE.filter((b) => mitOptional || !b.optional),
    verbindungen: VERBINDUNGEN.filter((v) => mitOptional || !v.optional),
  };
}

// ---------------------------------------------------------------- Abbildung für die Arbeit (Kapitel 5)

/**
 * Eigene, kompaktere Anordnung für die schwarz-weiße Abbildung: 1000 px breit, größere Schrift, Endpunkte je
 * Methode zusammengefasst, ohne Konten. Bei 16 cm Satzbreite ergibt das etwa 7 bis 9,5 pt. Inhalt und Verbindungen
 * sind dieselben wie im Diagramm.
 */
export const ABB = {
  breite: 1000,
  kopf: 34,
  zeile: 24,
  innen: 20,
  gruppeKopf: 48,
  abstand: 92,
  griffe: { l: 300, r: 700 } as Record<"l" | "r", number>,
};

type AbbLage = { x: number; y: number; breite: number; zeilen?: Zeile[] };

const Z = (id: string, text: string, art?: string): Zeile => ({ id, text, art });
const SPALTE2 = (ABB.breite - 2 * ABB.innen - 16) / 2;
const SPALTE3 = (ABB.breite - 2 * ABB.innen - 2 * 24) / 3;
const X2 = [ABB.innen, ABB.innen + SPALTE2 + 16];
const X3 = [ABB.innen, ABB.innen + SPALTE3 + 24, ABB.innen + 2 * (SPALTE3 + 24)];
const hoeheAbb = (n: number) => ABB.kopf + n * ABB.zeile;

const API_OBEN = ABB.gruppeKopf;
const API_MITTE = API_OBEN + hoeheAbb(3) + 14;
const API_UNTEN = API_MITTE + hoeheAbb(3) + 14;

export const ABB_LAGE: Record<string, AbbLage> = {
  seiten: { x: X2[0], y: ABB.gruppeKopf, breite: SPALTE2 },
  querschnitt: {
    x: X2[1],
    y: ABB.gruppeKopf,
    breite: SPALTE2,
    zeilen: QUERSCHNITT.zeilen.filter((z) => z.id !== "speicher"),
  },
  "fall-endpunkte": {
    x: X2[0],
    y: API_OBEN,
    breite: SPALTE2,
    zeilen: [
      Z("a", "/referenzmodell, /vorlage, /katalog", "GET"),
      Z("b", "/pruefen, /alternativen", "POST"),
      Z("c", "/gewichte/dimension, /gewichte/kostensatz", "POST"),
    ],
  },
  "bewertung-endpunkte": { x: X2[1], y: API_OBEN, breite: SPALTE2 },
  "sensitivitaet-endpunkte": {
    x: X2[0],
    y: API_MITTE,
    breite: SPALTE2,
    zeilen: [Z("a", "/tornado, /verlauf, /kipppunkte", "POST"), Z("b", "/karte, /dreieck", "POST")],
  },
  "inhalte-endpunkte": {
    x: X2[1],
    y: API_MITTE,
    breite: SPALTE2,
    zeilen: [
      Z("a", "/tutorial, /formeln, /glossar", "GET"),
      Z("b", "/latex, /latex/fall", "POST"),
      Z("c", "/export/felder.csv, /export/ergebnisse.csv", "POST"),
    ],
  },
  datenvertrag: {
    x: X2[0],
    y: API_UNTEN,
    breite: ABB.breite - 2 * ABB.innen,
    zeilen: [Z("a", "Fall-Datei Version 2 (Pydantic), prüft jede Anfrage und Antwort", "schema.py")],
  },
  fallmodell: {
    x: X3[0],
    y: ABB.gruppeKopf,
    breite: SPALTE3,
    zeilen: [
      Z("a", "modell.py, ausdruck.py", ".py"),
      Z("b", "Felder mit Herkunft und Spanne"),
      Z("c", "Kosten- und Emissionspositionen"),
      Z("d", "Faktorbausteine", "(11)–(13)"),
      Z("e", "Einflussfaktoren und Szenarien"),
    ],
  },
  auswertung: {
    x: X3[1],
    y: ABB.gruppeKopf,
    breite: SPALTE3,
    zeilen: [
      Z("a", "bewerte_modell, pruefe_modell"),
      Z("b", "Zulässigkeit (Gate)"),
      Z("c", "Technische Dimension", "(5), (6)"),
      Z("d", "Treibhauspotenzial", "(8)"),
      Z("e", "Normalisierung", "(9)"),
      Z("f", "Gesamtnutzwert", "(10)"),
    ],
  },
  sensitivitaetsmodul: { x: X3[2], y: ABB.gruppeKopf, breite: SPALTE3 },
  falldatei: { x: X3[0], y: ABB.gruppeKopf, breite: SPALTE3 },
  referenzimplementierung: {
    x: X3[1],
    y: ABB.gruppeKopf,
    breite: SPALTE3,
    zeilen: [
      Z("a", "gate, matching", ".py"),
      Z("b", "technisch, oekonomisch", ".py"),
      Z("c", "oekologisch, faktoren", ".py"),
      Z("d", "bewertung, parameter", ".py"),
    ],
  },
  kapitel4: { x: X3[2], y: ABB.gruppeKopf, breite: SPALTE3 },
};

/** Bausteine der Abbildung mit ihrer Lage und ihren Zeilen. */
export const ABB_BAUSTEINE: Baustein[] = BAUSTEINE.filter((b) => !b.optional).map((b) => {
  const lage = ABB_LAGE[b.id];
  return { ...b, x: lage.x, y: lage.y, breite: lage.breite, zeilen: lage.zeilen ?? b.zeilen };
});

export const ABB_GRUPPEN: Gruppe[] = (() => {
  let y = 0;
  return ROH.map((g, i) => {
    const unten = ABB_BAUSTEINE.filter((b) => b.gruppe === g.id).map((b) => b.y + hoeheAbb(b.zeilen.length));
    const hoehe = Math.max(...unten) + ABB.innen;
    const gruppe = { ...g, breite: ABB.breite, y, hoehe };
    y += hoehe + (i === 3 ? 36 : ABB.abstand);
    return gruppe;
  });
})();

export const ABB_HOEHE = ABB_GRUPPEN[ABB_GRUPPEN.length - 1].y + ABB_GRUPPEN[ABB_GRUPPEN.length - 1].hoehe;
