"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ApiFehler,
  tornado,
  type FallDatei,
  type ModellErgebnis,
  type TornadoAntwort,
} from "@/lib/api";
import { kompakt, mitEinheit, punkte, zahl } from "@/lib/format";
import {
  farbeAlternative,
  groesseText,
  kehrtUm,
  nameAlternative,
} from "@/lib/sensitivitaet";

type Props = {
  datei: FallDatei;
  ergebnis: ModellErgebnis;
  szenario: string | null;
};

function rangePair(referenz: number, abstand: number): [number, number] {
  return [Math.min(referenz, abstand), Math.max(referenz, abstand)];
}

/**
 * Achsenbereich der Darstellung: schließt 0 (Rangwechsel) und etwas Fläche links davon ein, wie Abbildung 4.
 * Nur Achsenskalierung, keine Fachrechnung.
 */
function achsenbereich(werte: number[]): { bereich: [number, number]; marken: number[] } {
  const lo = Math.min(0, ...werte);
  const hi = Math.max(0, ...werte);
  const schritt = hi - lo > 40 ? 10 : 5;
  const unten = Math.min(-schritt, Math.floor((lo - schritt * 0.4) / schritt) * schritt);
  const oben = Math.max(schritt, Math.ceil((hi + schritt * 0.4) / schritt) * schritt);
  const marken: number[] = [];
  for (let m = unten; m <= oben; m += schritt) marken.push(m);
  return { bereich: [unten, oben], marken };
}

export function TornadoSektion({ datei, ergebnis, szenario }: Props) {
  const alts = ergebnis.alternativen;
  const standard = useMemo(() => {
    if (alts.includes("intern") && alts.includes("extern")) {
      return ["intern", "extern"] as const;
    }
    return [ergebnis.rangfolge[0] ?? alts[0], ergebnis.rangfolge[1] ?? alts[1]] as const;
  }, [alts, ergebnis.rangfolge]);

  const [aWahl, setA] = useState(standard[0]);
  const [bWahl, setB] = useState(standard[1]);
  const a = aWahl;
  const b = aWahl === bWahl && alts.length > 1 ? (alts.find((x) => x !== aWahl) ?? bWahl) : bWahl;
  const [daten, setDaten] = useState<TornadoAntwort | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    let abbruch = false;
    const t = window.setTimeout(async () => {
      if (!a || !b || a === b) return;
      setLaedt(true);
      setFehler("");
      try {
        const antwort = await tornado(datei, a, b, szenario);
        if (!abbruch) setDaten(antwort);
      } catch (e) {
        if (!abbruch) {
          setDaten(null);
          setFehler(e instanceof ApiFehler ? e.message : "Tornado konnte nicht berechnet werden.");
        }
      } finally {
        if (!abbruch) setLaedt(false);
      }
    }, 300);
    return () => {
      abbruch = true;
      window.clearTimeout(t);
    };
  }, [datei, a, b, szenario]);

  const chartData = useMemo(() => {
    if (!daten) return [];
    const ref = daten.abstand;
    return daten.zeilen.map((z) => {
      const { text } = groesseText(datei, z.feld);
      return {
        name: text,
        feld: z.feld,
        unter: rangePair(ref, z.abstand_unten),
        ober: rangePair(ref, z.abstand_oben),
        abstand_unten: z.abstand_unten,
        abstand_oben: z.abstand_oben,
        untergrenze: z.untergrenze,
        obergrenze: z.obergrenze,
      };
    });
  }, [daten, datei]);

  const zusammenfassung = useMemo(() => {
    if (!daten || daten.zeilen.length === 0) return null;
    const erste = groesseText(datei, daten.zeilen[0].feld).text;
    const umkehr = daten.zeilen
      .filter((z) => kehrtUm(daten.abstand, z.abstand_unten, z.abstand_oben))
      .map((z) => groesseText(datei, z.feld).text);
    const nA = nameAlternative(datei, a);
    const nB = nameAlternative(datei, b);
    const satz =
      umkehr.length === 0
        ? `An keiner Grenze kehrt sich die Reihenfolge von ${nA} und ${nB} um.`
        : `Die Reihenfolge von ${nA} und ${nB} kehrt sich um bei: ${umkehr.join(", ")}.`;
    return { erste, satz };
  }, [daten, datei, a, b]);

  const { bereich, marken } = useMemo(() => {
    if (!daten) return { bereich: [-5, 5] as [number, number], marken: [-5, 0, 5] };
    return achsenbereich([
      daten.abstand,
      ...daten.zeilen.flatMap((z) => [z.abstand_unten, z.abstand_oben]),
    ]);
  }, [daten]);

  const restB = alts.filter((x) => x !== a);
  const hoehe = Math.max(220, 44 * chartData.length + 60);

  const onA = useCallback((v: string | null) => {
    if (v) setA(v);
  }, []);
  const onB = useCallback((v: string | null) => {
    if (v) setB(v);
  }, []);

  if (alts.length < 2) {
    return (
      <section id="tornado" className="scroll-mt-4">
        <h2 className="mb-1 text-lg font-medium">Tornado</h2>
        <p className="text-sm text-muted-foreground">
          Für einen Vergleich braucht es mindestens zwei zulässige Alternativen.
        </p>
      </section>
    );
  }

  return (
    <section id="tornado" className="scroll-mt-4 rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 text-lg font-medium">Tornado</h2>
      <p className="mb-3 max-w-[72ch] text-sm text-muted-foreground blocksatz">
        Jede Eingabe mit Spanne wird allein auf ihre Unter- und Obergrenze gesetzt, alle übrigen
        bleiben. Der Balken zeigt, wie sich der Abstand der Gesamtnutzwerte von A und B dabei ändert.
        Oben steht die Eingabe mit der größten Wirkung.
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Alternative A</span>
          <Select value={a} onValueChange={onA}>
            <SelectTrigger className="min-w-[200px]" aria-label="Alternative A">
              <SelectValue placeholder="Alternative A">
                {nameAlternative(datei, a)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {alts.map((s) => (
                <SelectItem key={s} value={s}>
                  {nameAlternative(datei, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Alternative B</span>
          <Select value={b} onValueChange={onB}>
            <SelectTrigger className="min-w-[200px]" aria-label="Alternative B">
              <SelectValue placeholder="Alternative B">
                {nameAlternative(datei, b)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {restB.map((s) => (
                <SelectItem key={s} value={s}>
                  {nameAlternative(datei, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {fehler && (
        <p className="mb-3 text-sm text-[var(--status-ausschluss-fg)]" role="alert">
          {fehler}
        </p>
      )}

      {laedt && !daten && <Skeleton className="mb-3 h-64 w-full" />}

      {zusammenfassung && (
        <p className="mb-3 text-sm">
          Größte Wirkung: <strong>{zusammenfassung.erste}</strong>. {zusammenfassung.satz}
        </p>
      )}

      {daten && chartData.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Kein Feld hat eine Spanne. Spannen legen Sie unter „Fall bearbeiten“ im Datenblatt fest.
        </p>
      )}

      {daten && chartData.length > 0 && (
        <Tabs defaultValue="diagramm">
          <TabsList>
            <TabsTrigger value="diagramm">Diagramm</TabsTrigger>
            <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
          </TabsList>
          <TabsContent value="diagramm" className="mt-3">
            <div
              role="img"
              aria-label={`Tornado-Diagramm Abstand ${nameAlternative(datei, a)} minus ${nameAlternative(datei, b)}, Referenz ${punkte(daten.abstand)}`}
            >
              <ResponsiveContainer width="100%" height={hoehe}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 22, right: 24, bottom: 8, left: 8 }}
                >
                  <CartesianGrid stroke="var(--linie)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={bereich}
                    ticks={marken}
                    allowDataOverflow
                    tickFormatter={(v) => zahl(v as number, 0)}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(_value, name, eintrag) => {
                      // Balken laufen von der Referenz zum Abstand; angezeigt wird der Abstand an der Grenze.
                      const z = eintrag?.payload as (typeof chartData)[number] | undefined;
                      if (!z) return ["", String(name)];
                      const unten = name === "Untergrenze";
                      const { einheit } = groesseText(datei, z.feld);
                      const grenze = kompakt(unten ? z.untergrenze : z.obergrenze, einheit);
                      return [punkte(unten ? z.abstand_unten : z.abstand_oben), `${name} ${grenze}`];
                    }}
                    labelFormatter={(l) => String(l)}
                    contentStyle={{
                      background: "var(--flaeche)",
                      border: "1px solid var(--linie)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  {/* Links von 0 liegt B vorn: leicht in der Farbe von B hinterlegt */}
                  <ReferenceArea
                    x1={bereich[0]}
                    x2={0}
                    fill={farbeAlternative(b, alts)}
                    fillOpacity={0.08}
                    ifOverflow="hidden"
                  />
                  <ReferenceLine
                    x={0}
                    stroke="var(--status-ausschluss-fg)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    label={{
                      value: "Rangwechsel",
                      position: "top",
                      fill: "var(--status-ausschluss-fg)",
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine
                    x={daten.abstand}
                    stroke="var(--markierung)"
                    strokeDasharray="3 3"
                    label={{
                      value: `Referenz ${zahl(daten.abstand)}`,
                      position: "top",
                      fill: "var(--text-gedaempft)",
                      fontSize: 11,
                    }}
                  />
                  <Bar
                    dataKey="unter"
                    name="Untergrenze"
                    fill="var(--tornado-unten)"
                    isAnimationActive={false}
                    barSize={10}
                  />
                  <Bar
                    dataKey="ober"
                    name="Obergrenze"
                    fill="var(--tornado-oben)"
                    isAnimationActive={false}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div
              className="flex items-center justify-between gap-4 pr-6 pl-[168px] text-xs whitespace-nowrap"
              data-testid="tornado-richtung"
            >
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>←</span>
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: farbeAlternative(b, alts) }}
                  aria-hidden
                />
                zugunsten {nameAlternative(datei, b)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: farbeAlternative(a, alts) }}
                  aria-hidden
                />
                zugunsten {nameAlternative(datei, a)}
                <span aria-hidden>→</span>
              </span>
            </div>
            <p className="mt-2 max-w-[80ch] text-xs text-muted-foreground blocksatz">
              Achse: Abstand der Gesamtnutzwerte {nameAlternative(datei, a)} minus{" "}
              {nameAlternative(datei, b)} in Punkten. Ein Balken nach rechts vergrößert den Vorsprung von {nameAlternative(datei, a)}, ein
              Balken nach links verkleinert ihn. Rechts der roten Linie „Rangwechsel“ liegt{" "}
              {nameAlternative(datei, a)} vorn, links davon {nameAlternative(datei, b)}.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm border border-[var(--tornado-oben)]"
                  style={{ background: "var(--tornado-unten)" }}
                  aria-hidden
                />
                Untergrenze
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ background: "var(--tornado-oben)" }}
                  aria-hidden
                />
                Obergrenze
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-0 w-4 border-t-2 border-dashed border-[var(--status-ausschluss-fg)]"
                  aria-hidden
                />
                Rangwechsel (Abstand 0)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-0 w-4 border-t-2 border-dotted border-[var(--markierung)]"
                  aria-hidden
                />
                Referenz (Werte des Falls)
              </span>
            </div>
          </TabsContent>
          <TabsContent value="tabelle" className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Größe</TableHead>
                  <TableHead className="text-right">Wert</TableHead>
                  <TableHead className="text-right">Untergrenze</TableHead>
                  <TableHead className="text-right">Obergrenze</TableHead>
                  <TableHead className="text-right">Abstand unten</TableHead>
                  <TableHead className="text-right">Abstand oben</TableHead>
                  <TableHead>kehrt um</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daten.zeilen.map((z) => {
                  const { text, einheit } = groesseText(datei, z.feld);
                  const wert = ergebnis.werte[z.feld];
                  return (
                    <TableRow key={z.feld}>
                      <TableCell>{text}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {mitEinheit(wert, einheit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {kompakt(z.untergrenze, einheit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {kompakt(z.obergrenze, einheit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {punkte(z.abstand_unten)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {punkte(z.abstand_oben)}
                      </TableCell>
                      <TableCell>
                        {kehrtUm(daten.abstand, z.abstand_unten, z.abstand_oben)
                          ? "ja"
                          : "nein"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
