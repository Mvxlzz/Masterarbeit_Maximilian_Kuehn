/**
 * Zugriff auf die FastAPI unter /api/* (rewrite in next.config.ts auf API_URL).
 * Rechnet niemals selbst: formatiert und zeigt nur an, was der Kern liefert.
 */

const BASE = "/api";

export type FallDatei = Record<string, unknown>;

export type Meldung = {
  stufe: "fehler" | "warnung";
  ort: string;
  text: string;
};

export type Schritt = {
  bereich: string;
  alternative: string | null;
  bezeichnung: string;
  formel: string;
  werte: Record<string, number>;
  ergebnis: number;
  einheit: string;
  links_latex: string;
  formel_latex: string;
  eingesetzt_latex: string;
  nummer: string;
  abschnitt: string;
};

/** Ein Balken im Wasserfall der Positionen, Zwischenstände aus kern.modell.wasserfall. */
export type WasserfallStufe = { position: string; wert: number; von: number; bis: number; summe: boolean };

export type ModellErgebnis = {
  alternativen: string[];
  ausgeschlossen: Record<string, string>;
  unterkriterien: Record<string, Record<string, number> | null>;
  s_tech: Record<string, number>;
  kosten_pos: Record<string, Record<string, number>>;
  co2_pos: Record<string, Record<string, number>>;
  kosten: Record<string, number>;
  co2: Record<string, number>;
  n_tech: Record<string, number>;
  n_oekon: Record<string, number>;
  n_oekol: Record<string, number>;
  beitrag: Record<string, Record<string, number>>;
  nutzwert: Record<string, number>;
  rangfolge: string[];
  hinweise: string[];
  rechenweg: Schritt[];
  szenario: string | null;
  gewichte: Record<string, number>;
  werte: Record<string, number>;
  /** Je Dimension (oekon, oekol) und Alternative; nur in der Antwort von POST /bewerten. */
  wasserfall?: Record<string, Record<string, WasserfallStufe[]>>;
};

/** Fehler der API mit deutscher Meldung aus dem `detail`-Feld (String oder Liste von Fehlern). */
export class ApiFehler extends Error {}

/** Wirft einen `ApiFehler` mit dem deutschen Text aus `detail`, wenn die Antwort nicht ok ist. */
async function fehlerPruefen(antwort: Response): Promise<void> {
  if (!antwort.ok) {
    let text = `Die Anfrage ist fehlgeschlagen (${antwort.status}).`;
    try {
      const daten = await antwort.json();
      const detail = daten?.detail;
      if (typeof detail === "string") {
        text = detail;
      } else if (Array.isArray(detail)) {
        text = detail
          .map((d) => {
            if (typeof d === "string") return d;
            const ort = Array.isArray(d?.loc) ? d.loc.join(".") : d?.loc ?? "";
            const msg = d?.msg ?? JSON.stringify(d);
            return ort ? `${ort}: ${msg}` : String(msg);
          })
          .join("; ");
      }
    } catch {
      // Antwort ohne verwertbaren JSON-Rumpf: Standardtext behalten.
    }
    throw new ApiFehler(text);
  }
}

async function verarbeiten<T>(antwort: Response): Promise<T> {
  await fehlerPruefen(antwort);
  return (await antwort.json()) as T;
}

async function post<T>(pfad: string, body: unknown): Promise<T> {
  const antwort = await fetch(`${BASE}${pfad}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return verarbeiten<T>(antwort);
}

/** POST mit JSON-Rumpf, Antwort als Datei (z. B. CSV). Fehler wie bei `post`. */
async function postDatei(pfad: string, body: unknown): Promise<Blob> {
  const antwort = await fetch(`${BASE}${pfad}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await fehlerPruefen(antwort);
  return antwort.blob();
}

async function get<T>(pfad: string): Promise<T> {
  const antwort = await fetch(`${BASE}${pfad}`);
  return verarbeiten<T>(antwort);
}

/** Referenzmodell (Kurbelwelle Nfz-Dieselmotor) als Fall-Datei. */
export function holeReferenzmodell(): Promise<FallDatei> {
  return get<FallDatei>("/referenzmodell");
}

/** Leere Vorlage für ein neues Projekt. */
export function holeVorlage(name = "Neuer Fall"): Promise<FallDatei> {
  return get<FallDatei>(`/vorlage?name=${encodeURIComponent(name)}`);
}

/** Prüfmeldungen einer Fall-Datei (Fehler und Warnungen). */
export function pruefen(datei: FallDatei): Promise<Meldung[]> {
  return post<Meldung[]>("/pruefen", { datei });
}

/** Bewertet eine Fall-Datei, optional in einem Szenario. */
export function bewerten(
  datei: FallDatei,
  szenario?: string | null
): Promise<ModellErgebnis> {
  return post<ModellErgebnis>("/bewerten", { datei, szenario: szenario ?? null });
}

/* ------------------------------------------------------------------ Katalog / Formeln / Gewichte (W4b) */

export type KatalogAntwort = {
  bereich: Record<string, number[]>;
  gewichtsprofile: Record<string, Record<string, number>>;
  arten: Record<string, string>;
  ableitungen: Record<string, string>;
  raster: Record<string, Record<string, string>>;
  raster_titel: Record<string, string>;
  faktortypen?: Record<string, string>;
  faktortyp_hilfe?: Record<string, string>;
  einstellungen?: Record<string, string>;
  bausteine?: Record<string, { bezeichnung: string; einheit: string }>;
};

export type LatexAntwort = { latex: string };

export type GewichteAntwort = { gewichte: Record<string, number> };

export type AlternativeEintrag = {
  schluessel: string;
  name: string;
  art: string;
  aktiv: boolean;
};

export type AlternativenAntwort = { datei: FallDatei };

/** Standardbereiche und Gewichtsvoreinstellungen (Konstanten). */
export function holeKatalog(): Promise<KatalogAntwort> {
  return get<KatalogAntwort>("/katalog");
}

/** LaTeX-Darstellung einer Formel (Anzeige, keine Auswertung). */
export function holeLatex(formel: string): Promise<LatexAntwort> {
  return post<LatexAntwort>("/latex", { formel });
}

/** Dimensionsgewicht setzen und Rest im Verhältnis anpassen. */
export function gewichteDimension(
  gewichte: Record<string, number>,
  dimension: string,
  wert: number
): Promise<GewichteAntwort> {
  return post<GewichteAntwort>("/gewichte/dimension", { gewichte, dimension, wert });
}

/** Gewichte aus CO₂-Kostensatz (über Kern-Austauschrate). */
export function gewichteKostensatz(
  datei: FallDatei,
  eurJeT: number,
  szenario?: string | null
): Promise<GewichteAntwort> {
  return post<GewichteAntwort>("/gewichte/kostensatz", {
    datei,
    eur_je_t: eurJeT,
    szenario: szenario ?? null,
  });
}

/** Alternativenliste setzen; Schlüssel in Positionen, Stufen und Lieferzeit nachziehen. */
export function alternativenSetzen(
  datei: FallDatei,
  alternativen: AlternativeEintrag[],
  zuordnung: Record<string, string | null>
): Promise<AlternativenAntwort> {
  return post<AlternativenAntwort>("/alternativen", {
    datei,
    alternativen,
    zuordnung,
  });
}

/* ------------------------------------------------------------------ Sensitivität (1:1 zu api/anfragen.py) */

export type TornadoZeile = {
  feld: string;
  untergrenze: number;
  obergrenze: number;
  abstand_unten: number;
  abstand_oben: number;
};

export type TornadoAntwort = {
  zeilen: TornadoZeile[];
  abstand: number;
};

export type VerlaufPunkt = {
  x: number;
  nutzwert: Record<string, number>;
};

export type KipppunktEintrag = {
  a: string;
  b: string;
  x: number;
};

export type VerlaufAntwort = {
  punkte: VerlaufPunkt[];
  kipppunkte: KipppunktEintrag[];
};

export type KarteAntwort = {
  karte: (string | null)[][];
  xs: number[];
  ys: number[];
};

export type DreieckPunkt = {
  w_tech: number;
  w_oekon: number;
  w_oekol: number;
  rang_1: string | null;
  abstand: number | null;
};

export type DreieckAntwort = {
  punkte: DreieckPunkt[];
};

/** Einparameter-Variation (Tornado) für den Abstand der Alternativen a und b. */
export function tornado(
  datei: FallDatei,
  a: string,
  b: string,
  szenario?: string | null
): Promise<TornadoAntwort> {
  return post<TornadoAntwort>("/tornado", {
    datei,
    a,
    b,
    szenario: szenario ?? null,
  });
}

/** Verlauf einer Größe über [lo, hi] inkl. Kipppunkte aller Paare. */
export function verlauf(
  datei: FallDatei,
  groesse: string,
  lo: number,
  hi: number,
  szenario?: string | null
): Promise<VerlaufAntwort> {
  return post<VerlaufAntwort>("/verlauf", {
    datei,
    groesse,
    lo,
    hi,
    szenario: szenario ?? null,
  });
}

/** Kipppunkt-Karte: Rang 1 je Rasterzelle über zwei Felder. */
export function karte(
  datei: FallDatei,
  feldX: string,
  xLo: number,
  xHi: number,
  feldY: string,
  yLo: number,
  yHi: number,
  punkte: number,
  szenario?: string | null
): Promise<KarteAntwort> {
  return post<KarteAntwort>("/karte", {
    datei,
    feld_x: feldX,
    x_lo: xLo,
    x_hi: xHi,
    feld_y: feldY,
    y_lo: yLo,
    y_hi: yHi,
    punkte,
    szenario: szenario ?? null,
  });
}

/** Gewichtsdreieck: Rang 1 je Gewichtskombination. */
export function dreieck(
  datei: FallDatei,
  schritte: number,
  szenario?: string | null
): Promise<DreieckAntwort> {
  return post<DreieckAntwort>("/dreieck", {
    datei,
    schritte,
    szenario: szenario ?? null,
  });
}

/* ------------------------------------------------------------------ Einführung (GET /tutorial) */

export type TutorialFormel = {
  titel: string;
  nummer: string;
  abschnitt: string;
  allgemein: string;
  eingesetzt: string;
  ergebnis: string;
  erklaerung: string;
  zeichen: { zeichen: string; text: string }[];
};

export type TutorialBalken = {
  titel: string;
  einheit: string;
  werte: { name: string; wert: number }[];
};

export type TutorialTabelle = {
  titel: string;
  spalten: string[];
  zeilen: string[][];
  markiert: number[];
};

export type TutorialRechenweg = { titel: string; schritte: Schritt[] };

export type TutorialStation = {
  nr: number;
  titel: string;
  abschnitt: string;
  text: string[];
  eingaben: TutorialTabelle | null;
  formeln: TutorialFormel[];
  tabellen: TutorialTabelle[];
  rechenweg: TutorialRechenweg[];
  kipppunkte: KipppunktEintrag[];
  satz: string;
  balken: TutorialBalken | null;
};

export type TutorialAntwort = {
  stationen: TutorialStation[];
  stufen: { titel: string; text: string }[];
  rundung: string;
};

/** Einführung über den Referenzfall: Texte, Formeln, Tabellen und Rechenweg, alle Zahlen aus kern/. */
export function holeTutorial(): Promise<TutorialAntwort> {
  return get<TutorialAntwort>("/tutorial");
}

/* ------------------------------------------------------------------ Szenarien */

/** Ein Szenario im Vergleich mit dem Basisfall (kern.modell.vergleich_szenarien). `szenario` null = Basisfall. */
export type SzenarioVergleich = {
  szenario: string | null;
  name: string | null;
  ergebnis: ModellErgebnis | null;
  differenz: Record<string, number>;
  anderer_sieger: boolean;
  fehler: string;
};

/** Basisfall und alle Szenarien der Datei mit Differenz zum Basisfall. */
export function szenarienVergleich(datei: FallDatei): Promise<SzenarioVergleich[]> {
  return post<SzenarioVergleich[]>("/szenarien", { datei });
}

/** Werte der Faktorbausteine im Szenario; `strafe_max` null heißt keine Obergrenze. */
export type BausteineAntwort = {
  szenario: string | null;
  werte: Record<string, number | null>;
};

export function bausteineWerte(
  datei: FallDatei,
  szenario?: string | null
): Promise<BausteineAntwort> {
  return post<BausteineAntwort>("/bausteine", { datei, szenario: szenario ?? null });
}

export type MethodenFormel = {
  nummer: string;
  titel: string;
  abschnitt: string;
  latex: string;
  zeichen: { zeichen: string; text: string }[];
  hinweis: string;
};

/** Formeln der Methode mit Zeichenerklärung (Wortlaut aus Kapitel 4). */
export function holeFormeln(): Promise<MethodenFormel[]> {
  return get<MethodenFormel[]>("/formeln");
}

/* ------------------------------------------------------------------ Formel- und Datenblätter, Export */

export type GlossarEintrag = {
  begriff: string;
  erklaerung: string;
  abschnitt: string;
};

/** Hilfsgröße oder Position des Falls als LaTeX; bei nicht darstellbarer Formel `latex` leer und `fehler` gesetzt. */
export type FallFormel = {
  art: "hilfsgroesse" | "position";
  name: string;
  bezeichnung: string;
  einheit: string;
  dimension: string;
  alternativen: string[];
  formel: string;
  links_latex: string;
  latex: string;
  fehler: string | null;
};

export type FallFormelnAntwort = {
  hilfsgroessen: FallFormel[];
  positionen: FallFormel[];
};

/** Begriffe wie in Kapitel 4 der Arbeit. */
export function holeGlossar(): Promise<GlossarEintrag[]> {
  return get<GlossarEintrag[]>("/glossar");
}

/** Hilfsgrößen und Positionen des Falls als LaTeX (Anzeige über kern.ausdruck.als_latex). */
export function fallFormeln(datei: FallDatei): Promise<FallFormelnAntwort> {
  return post<FallFormelnAntwort>("/latex/fall", { datei });
}

/** Alle Felder als CSV (Semikolon, Dezimalkomma, UTF-8 mit BOM). */
export function exportFelderCsv(datei: FallDatei): Promise<Blob> {
  return postDatei("/export/felder.csv", { datei });
}

/** Basisfall und alle Szenarien je Alternative als CSV; 422, solange der Fall Prüffehler enthält. */
export function exportErgebnisseCsv(datei: FallDatei): Promise<Blob> {
  return postDatei("/export/ergebnisse.csv", { datei });
}
