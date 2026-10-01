"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { achse } from "@/lib/achse";
import type { ModellErgebnis, Schritt, WasserfallStufe } from "@/lib/api";
import { CO2, co2, euro, zahl } from "@/lib/format";
import { farbeAlternative } from "@/lib/sensitivitaet";
import { cn } from "@/lib/utils";

type Dimension = "oekon" | "oekol";

const DIMENSIONEN: { schluessel: Dimension; titel: string; einheit: string; summe: string }[] = [
  { schluessel: "oekon", titel: "Kosten", einheit: "€", summe: "Kosten gesamt" },
  { schluessel: "oekol", titel: "Treibhauspotenzial", einheit: CO2, summe: "Treibhauspotenzial gesamt" },
];

/**
 * Rechenweg-Schritt zu einem Balken: Positionen nach Bezeichnung, Faktorbausteine („Verzug“, „Ausschussrisiko,
 * Kosten“) über den Namensanfang, die Summe über „Kosten gesamt“ bzw. „Treibhauspotenzial gesamt“.
 */
export function schrittZurStufe(
  rechenweg: Schritt[],
  alt: string,
  dim: Dimension,
  stufe: WasserfallStufe
): Schritt | undefined {
  const d = DIMENSIONEN.find((x) => x.schluessel === dim)!;
  if (stufe.summe) {
    return rechenweg.find((s) => s.bereich === "summe" && s.alternative === alt && s.bezeichnung === d.summe);
  }
  const kandidaten = rechenweg.filter(
    (s) =>
      s.alternative === alt &&
      (s.bereich === "position" || s.bereich === "baustein") &&
      s.einheit === d.einheit &&
      (s.bezeichnung === stufe.position || s.bezeichnung.startsWith(`${stufe.position}, `))
  );
  return kandidaten.find((s) => Math.abs(s.ergebnis - stufe.wert) < 1e-9) ?? kandidaten[0];
}

function achseStufen(stufen: WasserfallStufe[]) {
  return achse(stufen.flatMap((s) => [s.von, s.bis]));
}

type Zeile = WasserfallStufe & { spanne: [number, number]; farbe: string; text: string };

type BalkenProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: Zeile;
};

/**
 * Positionen einer Alternative als Wasserfall (Kapitel 5, Positionen je Alternative): jede Position ein Schritt
 * in gedämpftem Grau, die Summe als Balken in der Farbe der Alternative. Die Zwischenstände kommen aus der API.
 */
export function WasserfallSektion({
  ergebnis,
  nameVon,
  gewaehlt,
  onWaehle,
}: {
  ergebnis: ModellErgebnis;
  nameVon: (schluessel: string) => string;
  gewaehlt?: { zeile: string; altName: string } | null;
  onWaehle: (schritt: Schritt, zeile: string, alt: string) => void;
}) {
  const alts = ergebnis.alternativen;
  const [altWahl, setAlt] = useState(ergebnis.rangfolge[0] ?? alts[0]);
  const [dim, setDim] = useState<Dimension>("oekon");
  const alt = alts.includes(altWahl) ? altWahl : alts[0];
  const d = DIMENSIONEN.find((x) => x.schluessel === dim)!;
  const format = dim === "oekon" ? euro : co2;
  const stufen = useMemo(() => ergebnis.wasserfall?.[dim]?.[alt] ?? [], [ergebnis, dim, alt]);

  const daten: Zeile[] = useMemo(
    () =>
      stufen.map((s) => ({
        ...s,
        spanne: [Math.min(s.von, s.bis), Math.max(s.von, s.bis)],
        farbe: s.summe ? farbeAlternative(alt, alts) : "var(--text-gedaempft)",
        text: s.summe ? "Summe" : s.position,
      })),
    [stufen, alt, alts]
  );
  const { bereich, marken } = useMemo(() => achseStufen(stufen), [stufen]);

  if (!alt || !ergebnis.wasserfall) return null;

  function waehle(s: WasserfallStufe) {
    const schritt = schrittZurStufe(ergebnis.rechenweg, alt, dim, s);
    if (schritt) onWaehle(schritt, s.summe ? d.summe : s.position, alt);
  }

  const groesste = stufen
    .filter((s) => !s.summe)
    .reduce<WasserfallStufe | null>((m, s) => (m === null || s.wert > m.wert ? s : m), null);
  const summe = stufen.find((s) => s.summe);
  // Layout: feste Zeilenhöhe; die Lücke zwischen zwei Balken braucht der Verbinder
  const ZEILE = 34;
  const RAND = { oben: 4, unten: 4, achse: 30 };
  const BALKEN = 18;
  const hoehe = RAND.oben + RAND.unten + RAND.achse + ZEILE * daten.length;

  // Zeichenfunktion für `shape` (kein eigener Komponententyp, Recharts ruft sie je Balken auf)
  function balken(props: BalkenProps) {
    const { x = 0, y = 0, width = 0, height = 0, index = 0, payload } = props;
    if (!payload) return null;
    const ende = x + width;
    // Verbinder zum vorherigen Balken: dort, wo dieser Schritt ansetzt (Ende des vorherigen Zwischenstands)
    const ansatz = payload.summe || payload.wert < 0 ? ende : x;
    const luecke = ZEILE - height;
    const markiert =
      gewaehlt?.altName === nameVon(alt) && gewaehlt.zeile === (payload.summe ? d.summe : payload.position);
    return (
      <g
        className="cursor-pointer"
        onClick={() => waehle(payload)}
        data-testid={payload.summe ? "wasserfall-summe" : "wasserfall-balken"}
      >
        {index > 0 && (
          <line x1={ansatz} x2={ansatz} y1={y - luecke} y2={y} stroke="var(--linie-stark)" strokeWidth={1} />
        )}
        <Rectangle
          x={x}
          y={y}
          width={Math.max(width, 1)}
          height={height}
          fill={payload.farbe}
          stroke={markiert ? "var(--foreground)" : "none"}
          strokeWidth={1.5}
          radius={2}
        />
        <text
          x={Math.max(x, ende) + 6}
          y={y + height / 2}
          dominantBaseline="central"
          fontSize={11}
          className={cn("fill-foreground font-mono", payload.summe && "font-semibold")}
        >
          {payload.summe ? format(payload.wert) : zahl(payload.wert)}
        </text>
      </g>
    );
  }

  return (
    <section aria-labelledby="wasserfall-titel" className="rounded-lg border border-border bg-card p-4" data-testid="wasserfall">
      <h2 id="wasserfall-titel" className="mb-1 text-lg font-semibold">
        Positionen als Wasserfall
      </h2>
      <p className="mb-3 max-w-[72ch] text-sm text-muted-foreground blocksatz">
        Jede Position setzt dort an, wo die vorherige endet. Der letzte Balken ist die Summe (Formel 8). Wählen Sie
        einen Balken für seinen Rechenweg.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Umschalter
          titel="Alternative"
          optionen={alts.map((a) => ({ wert: a, text: nameVon(a) }))}
          wert={alt}
          onWert={setAlt}
        />
        <Umschalter
          titel="Dimension"
          optionen={DIMENSIONEN.map((x) => ({ wert: x.schluessel, text: x.titel }))}
          wert={dim}
          onWert={(v) => setDim(v as Dimension)}
        />
      </div>

      {groesste && summe && (
        <p className="mb-3 text-sm" data-testid="wasserfall-satz">
          {nameVon(alt)}: Größte Position ist <strong className="font-medium">{groesste.position}</strong> mit{" "}
          {format(groesste.wert)} von {format(summe.wert)}.
        </p>
      )}

      {stufen.length <= 1 ? (
        <p className="text-sm text-muted-foreground">Diese Alternative hat in dieser Dimension keine Positionen.</p>
      ) : (
        <Tabs defaultValue="diagramm">
          <TabsList>
            <TabsTrigger value="diagramm">Diagramm</TabsTrigger>
            <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
          </TabsList>
          <TabsContent value="diagramm" className="mt-3">
            <div
              // Recharts fokussiert beim Klick eine Ebene mit tabindex -1; ohne Tastaturfokus kein Rahmen
              className="[&_[tabindex='-1']:focus]:outline-none [&_.recharts-surface:focus:not(:focus-visible)]:outline-none"
              role="img"
              aria-label={`Wasserfall ${d.titel} je Position, ${nameVon(alt)}, Summe ${summe ? format(summe.wert) : ""}`}
            >
              <ResponsiveContainer width="100%" height={hoehe}>
                <BarChart layout="vertical" data={daten} margin={{ top: RAND.oben, right: 112, bottom: RAND.unten, left: 8 }}>
                  <CartesianGrid stroke="var(--linie)" horizontal={false} />
                  <XAxis
                    type="number"
                    height={RAND.achse}
                    domain={bereich}
                    ticks={marken}
                    tickFormatter={(v) => zahl(v as number, 0)}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="text"
                    width={230}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                  />
                  <Bar
                    dataKey="spanne"
                    isAnimationActive={false}
                    barSize={BALKEN}
                    shape={balken}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Achse: {d.titel} [{d.einheit}]. Graue Balken: Positionen, farbiger Balken: Summe.
            </p>
          </TabsContent>
          <TabsContent value="tabelle" className="mt-3">
            <div className="overflow-hidden rounded-lg border border-border">
              <Table className="font-mono text-sm" data-testid="wasserfall-tabelle">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-sans">Position</TableHead>
                    <TableHead className="text-right font-sans">
                      {d.titel} [{d.einheit}]
                    </TableHead>
                    <TableHead className="text-right font-sans">
                      Zwischenstand [{d.einheit}]
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stufen.map((s) => (
                    <TableRow key={s.summe ? "Summe" : s.position} className={cn(s.summe && "font-semibold")}>
                      <TableCell className="font-sans">{s.summe ? "Summe" : s.position}</TableCell>
                      <TableCell className="text-right">
                        <button type="button" onClick={() => waehle(s)} className="hover:text-primary">
                          {zahl(s.wert)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{zahl(s.bis)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}

function Umschalter({
  titel,
  optionen,
  wert,
  onWert,
}: {
  titel: string;
  optionen: { wert: string; text: string }[];
  wert: string;
  onWert: (v: string) => void;
}) {
  return (
    <div role="group" aria-label={titel} className="inline-flex flex-wrap gap-0.5 rounded-lg border border-border p-0.5">
      {optionen.map((o) => (
        <button
          key={o.wert}
          type="button"
          aria-pressed={wert === o.wert}
          onClick={() => onWert(o.wert)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground",
            wert === o.wert && "bg-accent text-foreground"
          )}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}
