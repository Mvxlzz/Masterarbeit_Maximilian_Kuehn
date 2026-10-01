"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AltMarkierung, AlternativenLegende } from "@/components/sensitivitaet/alternativen-legende";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { achse } from "@/lib/achse";
import type { ModellErgebnis, Schritt } from "@/lib/api";
import { ergebnisseAusRechenweg } from "@/lib/fall";
import { CO2, co2, euro, mitEinheit, zahl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const AUSTAUSCHRATE_EINHEIT = "€ je t CO₂-Äq";

/** Bezeichnungen der Summen im Rechenweg (bereich „summe“), wie im Wasserfall. */
const SUMME = { kosten: "Kosten gesamt", co2: "Treibhauspotenzial gesamt" } as const;
type Groesse = keyof typeof SUMME;

export type ZielkonfliktAussage =
  | { art: "keiner"; alt: string }
  | { art: "konflikt"; kosten: string; co2: string; kostenMitHoechstemCo2: boolean };

/**
 * Aussage über den Zielkonflikt: reiner Vergleich der Rohwerte aus dem Kern (wie „größte Position“ beim Wasserfall),
 * keine Rechnung. Kein Zielkonflikt, wenn eine Alternative in beiden Dimensionen den geringsten Wert hat.
 */
export function zielkonfliktAussage(
  ergebnis: Pick<ModellErgebnis, "alternativen" | "kosten" | "co2">
): ZielkonfliktAussage | null {
  const alts = ergebnis.alternativen;
  if (alts.length < 2) return null;
  const kleinste = (werte: Record<string, number>) => {
    const min = Math.min(...alts.map((a) => werte[a]));
    return alts.filter((a) => werte[a] === min);
  };
  const guenstigKosten = kleinste(ergebnis.kosten);
  const guenstigCo2 = kleinste(ergebnis.co2);
  const beide = guenstigKosten.find((a) => guenstigCo2.includes(a));
  if (beide) return { art: "keiner", alt: beide };
  const maxCo2 = Math.max(...alts.map((a) => ergebnis.co2[a]));
  return {
    art: "konflikt",
    kosten: guenstigKosten[0],
    co2: guenstigCo2[0],
    kostenMitHoechstemCo2: ergebnis.co2[guenstigKosten[0]] === maxCo2,
  };
}

/** Rechenweg-Schritt „Kosten gesamt“ bzw. „Treibhauspotenzial gesamt“ einer Alternative. */
export function summenSchritt(rechenweg: Schritt[], alt: string, groesse: Groesse): Schritt | undefined {
  return rechenweg.find((s) => s.bereich === "summe" && s.alternative === alt && s.bezeichnung === SUMME[groesse]);
}

type Punkt = {
  alt: string;
  name: string;
  kosten: number;
  co2: number;
  /** Beschriftung links oder rechts vom Punkt und Stufe nach oben, damit nahe Punkte sich nicht überdecken. */
  anker: "start" | "end";
  ebene: number;
};

/**
 * Lage der Beschriftungen (nur Zeichengeometrie): rechts vom Punkt, weit rechts links davon. Von rechts nach links
 * gestuft, damit die Beschriftung eines linken Punkts über seinem nahen rechten Nachbarn verläuft.
 */
function beschriften(
  roh: Omit<Punkt, "anker" | "ebene">[],
  xMax: number,
  yMax: number
): Punkt[] {
  const fertig: Punkt[] = [];
  for (const p of [...roh].sort((a, b) => b.kosten - a.kosten)) {
    const anker: Punkt["anker"] = p.kosten > 0.6 * xMax ? "end" : "start";
    const nah = fertig.filter(
      (q) =>
        q.anker === anker &&
        Math.abs(q.kosten - p.kosten) < 0.3 * xMax &&
        Math.abs(q.co2 - p.co2) < 0.1 * yMax
    );
    fertig.push({ ...p, anker, ebene: nah.length ? Math.max(...nah.map((q) => q.ebene)) + 1 : 0 });
  }
  return roh.map((p) => fertig.find((q) => q.alt === p.alt)!);
}

/**
 * Zielkonflikt Kosten gegen Treibhauspotenzial (Kapitel 5, Tabelle 23): Rohwerte der zulässigen Alternativen als
 * Streudiagramm, dazu die implizite Austauschrate aus dem Rechenweg (Abschnitt 4.4.2).
 */
export function ZielkonfliktSektion({
  ergebnis,
  nameVon,
  gewaehlt,
  onWaehle,
}: {
  ergebnis: ModellErgebnis;
  nameVon: (schluessel: string) => string;
  gewaehlt?: { zeile: string; altName: string } | null;
  onWaehle: (schritt: Schritt, zeile: string, altName: string) => void;
}) {
  const alts = ergebnis.alternativen;
  const aussage = zielkonfliktAussage(ergebnis);
  const rate = useMemo(() => ergebnisseAusRechenweg(ergebnis.rechenweg).austauschrate, [ergebnis]);
  const rateSchritt = ergebnis.rechenweg.find((s) => s.bereich === "austauschrate");

  const x = useMemo(() => achse(alts.map((a) => ergebnis.kosten[a])), [alts, ergebnis]);
  const y = useMemo(() => achse(alts.map((a) => ergebnis.co2[a])), [alts, ergebnis]);
  const punkte = useMemo(
    () =>
      beschriften(
        alts.map((a) => ({ alt: a, name: nameVon(a), kosten: ergebnis.kosten[a], co2: ergebnis.co2[a] })),
        x.bereich[1] || 1,
        y.bereich[1] || 1
      ),
    [alts, ergebnis, nameVon, x, y]
  );

  function waehle(alt: string, groesse: Groesse) {
    const schritt = summenSchritt(ergebnis.rechenweg, alt, groesse);
    if (schritt) onWaehle(schritt, SUMME[groesse], nameVon(alt));
  }

  const markiert = (alt: string, groesse: Groesse) =>
    gewaehlt?.altName === nameVon(alt) && gewaehlt.zeile === SUMME[groesse];

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="zielkonflikt-titel"
        className="rounded-lg border border-border bg-card p-4"
        data-testid="zielkonflikt"
      >
        <h2 id="zielkonflikt-titel" className="mb-1 text-lg font-semibold">
          Zielkonflikt Kosten gegen Treibhauspotenzial
        </h2>
        <p className="mb-3 max-w-[72ch] text-sm text-muted-foreground blocksatz">
          Rohwerte vor der Normalisierung. Eine Alternative links unten ist in beiden Dimensionen günstiger als eine
          rechts oben. Wählen Sie einen Punkt für den Rechenweg seiner Kosten.
        </p>

        {aussage && (
          <p className="mb-3 text-sm" data-testid="zielkonflikt-aussage">
            {aussage.art === "keiner" ? (
              <>
                <strong className="font-medium">Kein Zielkonflikt:</strong> {nameVon(aussage.alt)} hat die geringsten
                Kosten und das geringste Treibhauspotenzial und ist damit in beiden Dimensionen am günstigsten.
              </>
            ) : (
              <>
                <strong className="font-medium">Zielkonflikt:</strong> {nameVon(aussage.kosten)} hat die geringsten
                Kosten, {nameVon(aussage.co2)} das geringste Treibhauspotenzial.
                {aussage.kostenMitHoechstemCo2 &&
                  ` ${nameVon(aussage.kosten)} hat zugleich das höchste Treibhauspotenzial.`}{" "}
                Welche Alternative vorn liegt, entscheiden die Gewichte.
              </>
            )}
          </p>
        )}

        <div className="mb-3">
          <AlternativenLegende alternativen={alts.map((a) => ({ schluessel: a, name: nameVon(a) }))} />
        </div>

        <Tabs defaultValue="diagramm">
          <TabsList>
            <TabsTrigger value="diagramm">Diagramm</TabsTrigger>
            <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
          </TabsList>
          <TabsContent value="diagramm" className="mt-3">
            <div
              className="[&_[tabindex='-1']:focus]:outline-none [&_.recharts-surface:focus:not(:focus-visible)]:outline-none"
              role="img"
              aria-label={`Streudiagramm Kosten gegen Treibhauspotenzial: ${punkte
                .map((p) => `${p.name} ${euro(p.kosten)} und ${co2(p.co2)}`)
                .join("; ")}`}
            >
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 24, right: 24, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="var(--linie)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="kosten"
                    domain={x.bereich}
                    ticks={x.marken}
                    tickFormatter={(v) => zahl(v as number, 0)}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                    height={44}
                    label={{
                      value: "Kosten [€]",
                      position: "insideBottom",
                      offset: 0,
                      fontSize: 11,
                      fill: "var(--text-gedaempft)",
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="co2"
                    domain={y.bereich}
                    ticks={y.marken}
                    tickFormatter={(v) => zahl(v as number, 0)}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                    width={72}
                    label={{
                      value: `Treibhauspotenzial [${CO2}]`,
                      angle: -90,
                      position: "insideLeft",
                      offset: 4,
                      style: { textAnchor: "middle" },
                      fontSize: 11,
                      fill: "var(--text-gedaempft)",
                    }}
                  />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      const p = active ? (payload?.[0]?.payload as Punkt | undefined) : undefined;
                      if (!p) return null;
                      return (
                        <div className="rounded-md border border-border bg-[var(--flaeche)] px-2.5 py-1.5 text-xs shadow-sm">
                          <p className="font-medium">{p.name}</p>
                          <p>
                            Kosten: <span className="font-mono">{euro(p.kosten)}</span>
                          </p>
                          <p>
                            Treibhauspotenzial: <span className="font-mono">{co2(p.co2)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  {punkte.map((p) => (
                    <Scatter
                      key={p.alt}
                      name={p.name}
                      data={[p]}
                      isAnimationActive={false}
                      shape={(props: { cx?: number; cy?: number }) => (
                        <g
                          className="cursor-pointer"
                          data-testid="zielkonflikt-punkt"
                          data-alt={p.alt}
                          onClick={() => waehle(p.alt, "kosten")}
                        >
                          {/* Trefferfläche größer als die Markierung */}
                          <circle cx={props.cx} cy={props.cy} r={12} fill="transparent" />
                          {markiert(p.alt, "kosten") && (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={11}
                              fill="none"
                              stroke="var(--foreground)"
                              strokeWidth={1.5}
                            />
                          )}
                          <AltMarkierung schluessel={p.alt} x={props.cx ?? 0} y={props.cy ?? 0} size={12} alle={alts} />
                        </g>
                      )}
                    >
                      <LabelList
                        dataKey="name"
                        content={(lp) => {
                          const { x: lx = 0, y: ly = 0, width = 0, height = 0 } = lp as {
                            x?: number;
                            y?: number;
                            width?: number;
                            height?: number;
                          };
                          const cx = Number(lx) + Number(width) / 2;
                          const cy = Number(ly) + Number(height) / 2;
                          return (
                            <text
                              x={p.anker === "start" ? cx + 12 : cx - 12}
                              y={cy - 10 - p.ebene * 15}
                              textAnchor={p.anker}
                              fontSize={11}
                              className="pointer-events-none fill-foreground"
                            >
                              {p.name}
                            </text>
                          );
                        }}
                      />
                    </Scatter>
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Beide Achsen beginnen bei 0. Farbe und Form kennzeichnen die Alternative.
            </p>
          </TabsContent>
          <TabsContent value="tabelle" className="mt-3">
            <div className="overflow-hidden rounded-lg border border-border">
              <Table className="font-mono text-sm" data-testid="zielkonflikt-tabelle">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-sans">Alternative</TableHead>
                    <TableHead className="text-right font-sans">Kosten [€]</TableHead>
                    <TableHead className="text-right font-sans">Treibhauspotenzial [{CO2}]</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alts.map((a) => (
                    <TableRow key={a}>
                      <TableCell className="font-sans">{nameVon(a)}</TableCell>
                      {(["kosten", "co2"] as const).map((g) => (
                        <TableCell key={g} className="text-right">
                          <button
                            type="button"
                            onClick={() => waehle(a, g)}
                            className={cn("hover:text-primary", markiert(a, g) && "text-primary")}
                            aria-label={`${SUMME[g]}, ${nameVon(a)}: ${g === "kosten" ? euro(ergebnis.kosten[a]) : co2(ergebnis.co2[a])}, Rechenweg zeigen`}
                          >
                            {zahl(g === "kosten" ? ergebnis.kosten[a] : ergebnis.co2[a])}
                          </button>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {rate !== null && rateSchritt ? (
        <section aria-labelledby="austauschrate-titel" className="flex flex-col gap-2" data-testid="austauschrate">
          <div className="max-w-sm rounded-lg border border-border bg-card p-3.5">
            <h3 id="austauschrate-titel" className="mb-1.5 text-xs text-muted-foreground">
              Implizite Austauschrate
            </h3>
            <button
              type="button"
              onClick={() => onWaehle(rateSchritt, "Implizite Austauschrate", "alle zulässigen Alternativen")}
              className={cn(
                "font-mono text-2xl font-semibold leading-tight hover:text-primary",
                gewaehlt?.zeile === "Implizite Austauschrate" && "text-primary"
              )}
              aria-label={`Implizite Austauschrate ${mitEinheit(rate, AUSTAUSCHRATE_EINHEIT, 0)}, Rechenweg zeigen`}
              data-testid="austauschrate-wert"
            >
              {zahl(rate, 0)}
              <span className="ml-1 text-sm font-medium text-muted-foreground">{AUSTAUSCHRATE_EINHEIT}</span>
            </button>
            <p className="mt-1.5 text-xs text-muted-foreground">bei den wirksamen Gewichten (Abschnitt 4.4.2)</p>
          </div>
          <p className="max-w-[72ch] text-xs text-muted-foreground blocksatz">
            So viel Euro Mehrkosten gleicht eine Tonne weniger Treibhauspotenzial im Gesamtnutzwert aus. Die Rate folgt
            aus dem Verhältnis der Gewichte und den Spannweiten von Kosten und Treibhauspotenzial der zulässigen
            Alternativen. Sie ist eine Folge des Alternativenfelds, keine Eigenschaft der Methode.
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="austauschrate-hinweis">
          Die implizite Austauschrate ist hier nicht bestimmbar, weil sich das Treibhauspotenzial der zulässigen
          Alternativen nicht unterscheidet oder das ökonomische Gewicht 0 ist.
        </p>
      )}
    </div>
  );
}
