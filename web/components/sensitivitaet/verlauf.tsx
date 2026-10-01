"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AlternativenLegende } from "@/components/sensitivitaet/alternativen-legende";
import { BereichEingabe } from "@/components/sensitivitaet/bereich-eingabe";
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
  verlauf,
  type FallDatei,
  type ModellErgebnis,
  type VerlaufAntwort,
} from "@/lib/api";
import { kipppunkt, punkte, zahl } from "@/lib/format";
import {
  GEWICHTE,
  alternativenAusDatei,
  farbeAlternative,
  formAlternative,
  groesseLabel,
  groesseText,
  groessenListe,
  nameAlternative,
  standardbereich,
} from "@/lib/sensitivitaet";

type Props = {
  datei: FallDatei;
  ergebnis: ModellErgebnis;
  szenario: string | null;
};

function DotForm({
  cx,
  cy,
  schluessel,
  alle,
}: {
  cx?: number;
  cy?: number;
  schluessel: string;
  alle: string[];
}) {
  if (cx === undefined || cy === undefined) return null;
  const farbe = farbeAlternative(schluessel, alle);
  const form = formAlternative(schluessel);
  const s = 7;
  if (form === "kreis") {
    return <circle cx={cx} cy={cy} r={3.5} fill={farbe} />;
  }
  if (form === "quadrat") {
    return (
      <rect x={cx - 3.5} y={cy - 3.5} width={s} height={s} fill={farbe} />
    );
  }
  if (form === "dreieck") {
    return (
      <polygon
        points={`${cx},${cy - 4} ${cx - 4},${cy + 3.5} ${cx + 4},${cy + 3.5}`}
        fill={farbe}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={2.5} fill={farbe} />;
}

export function VerlaufSektion({ datei, ergebnis, szenario }: Props) {
  const optionen = useMemo(() => groessenListe(datei, true), [datei]);
  const [groesse, setGroesse] = useState(optionen[0] ?? "w_tech");
  const vorschlag = useMemo(
    () =>
      groesse.startsWith("w_")
        ? ([1 / 3, 1] as [number, number])
        : standardbereich(datei, groesse),
    [datei, groesse]
  );
  const [bereich, setBereich] = useState<[number, number] | null>(vorschlag);
  const [daten, setDaten] = useState<VerlaufAntwort | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  const onBereich = useCallback((b: [number, number] | null) => setBereich(b), []);

  useEffect(() => {
    let abbruch = false;
    if (!bereich) {
      return () => {
        abbruch = true;
      };
    }
    const t = window.setTimeout(async () => {
      setLaedt(true);
      setFehler("");
      try {
        const antwort = await verlauf(datei, groesse, bereich[0], bereich[1], szenario);
        if (!abbruch) setDaten(antwort);
      } catch (e) {
        if (!abbruch) {
          setDaten(null);
          setFehler(e instanceof ApiFehler ? e.message : "Verlauf konnte nicht berechnet werden.");
        }
      } finally {
        if (!abbruch) setLaedt(false);
      }
    }, 300);
    return () => {
      abbruch = true;
      window.clearTimeout(t);
    };
  }, [datei, groesse, bereich, szenario]);

  const { text, einheit } = groesseText(datei, groesse);
  const alts = useMemo(() => {
    if (!daten) return ergebnis.alternativen;
    const keys = new Set<string>();
    for (const p of daten.punkte) {
      for (const k of Object.keys(p.nutzwert)) keys.add(k);
    }
    return [...keys];
  }, [daten, ergebnis.alternativen]);

  const chartData = useMemo(() => {
    if (!daten) return [];
    return daten.punkte.map((p) => ({ x: p.x, ...p.nutzwert }));
  }, [daten]);

  const aktuellerWert = useMemo(() => {
    if (GEWICHTE.includes(groesse as (typeof GEWICHTE)[number])) {
      return ergebnis.gewichte[groesse.slice(2)];
    }
    return ergebnis.werte[groesse];
  }, [ergebnis, groesse]);

  const kippText = useMemo(() => {
    if (!daten) return "";
    if (daten.kipppunkte.length === 0) {
      return "Im gewählten Bereich tauschen keine zwei Alternativen ihre Reihenfolge.";
    }
    const teile = daten.kipppunkte.map(
      (k) =>
        `${nameAlternative(datei, k.a)} / ${nameAlternative(datei, k.b)} bei ${kipppunkt(k.x, einheit)}`
    );
    return `Kipppunkte im Bereich: ${teile.join("; ")}.`;
  }, [daten, datei, einheit]);

  return (
    <section id="verlauf" className="scroll-mt-4 rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 text-lg font-medium">Verlauf · {text}</h2>
      <p className="mb-3 max-w-[72ch] text-sm text-muted-foreground blocksatz">
        Eine Größe wird über einen Bereich variiert. Ein Kipppunkt ist der Wert, an dem zwei
        Alternativen ihre Reihenfolge tauschen. Bei einem Gewicht verteilt sich der Rest im
        bisherigen Verhältnis auf die beiden anderen Dimensionen.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Größe</span>
          <Select value={groesse} onValueChange={(v) => v && setGroesse(v)}>
            <SelectTrigger className="min-w-[240px]" aria-label="Größe">
              <SelectValue placeholder="Größe">
                {groesseLabel(datei, groesse)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {optionen.map((g) => (
                <SelectItem key={g} value={g}>
                  {groesseLabel(datei, g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <BereichEingabe
          key={`${groesse}-${vorschlag[0]}-${vorschlag[1]}`}
          id="verlauf"
          einheit={einheit}
          vorschlag={vorschlag}
          onGueltig={onBereich}
        />
      </div>

      {fehler && (
        <p className="mb-3 text-sm text-[var(--status-ausschluss-fg)]" role="alert">
          {fehler}
        </p>
      )}

      {laedt && !daten && <Skeleton className="mb-3 h-64 w-full" />}

      {daten && <p className="mb-3 text-sm">{kippText}</p>}

      {daten && (
        <Tabs defaultValue="diagramm">
          <TabsList>
            <TabsTrigger value="diagramm">Diagramm</TabsTrigger>
            <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
          </TabsList>
          <TabsContent value="diagramm" className="mt-3">
            <div
              role="img"
              aria-label={`Verlauf Gesamtnutzwert über ${text}${daten.kipppunkte.length ? `, Kipppunkte ${daten.kipppunkte.map((k) => kipppunkt(k.x)).join(" und ")}` : ""}`}
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="var(--linie)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(v) => zahl(v as number, 3)}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                  />
                  <YAxis
                    tickFormatter={(v) => zahl(v as number)}
                    stroke="var(--text-gedaempft)"
                    fontSize={11}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      punkte(Number(value)),
                      nameAlternative(datei, String(name)),
                    ]}
                    labelFormatter={(l) => kipppunkt(Number(l), einheit)}
                    contentStyle={{
                      background: "var(--flaeche)",
                      border: "1px solid var(--linie)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  {daten.kipppunkte.map((k) => (
                    <ReferenceLine
                      key={`${k.a}-${k.b}-${k.x}`}
                      x={k.x}
                      stroke="var(--text-gedaempft)"
                      strokeDasharray="4 4"
                      label={{
                        value: kipppunkt(k.x),
                        position: "insideTop",
                        fill: "var(--text-gedaempft)",
                        fontSize: 11,
                      }}
                    />
                  ))}
                  {aktuellerWert !== undefined && Number.isFinite(aktuellerWert) && (
                    <ReferenceLine
                      x={aktuellerWert}
                      stroke="var(--markierung)"
                      strokeWidth={1}
                    />
                  )}
                  {alts.map((alt) => (
                    <Line
                      key={alt}
                      type="monotone"
                      dataKey={alt}
                      name={alt}
                      stroke={farbeAlternative(alt, alts)}
                      strokeWidth={2}
                      dot={(props) => (
                        <DotForm
                          key={`${alt}-${props.index}`}
                          cx={props.cx}
                          cy={props.cy}
                          schluessel={alt}
                          alle={alts}
                        />
                      )}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2">
              <AlternativenLegende alternativen={alternativenAusDatei(datei)} />
            </div>
          </TabsContent>
          <TabsContent value="tabelle" className="mt-3 space-y-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text}</TableHead>
                  {alts.map((alt) => (
                    <TableHead key={alt} className="text-right">
                      {nameAlternative(datei, alt)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {daten.punkte.map((p) => (
                  <TableRow key={p.x}>
                    <TableCell className="font-mono text-xs">
                      {kipppunkt(p.x, einheit)}
                    </TableCell>
                    {alts.map((alt) => (
                      <TableCell key={alt} className="text-right font-mono text-xs">
                        {punkte(p.nutzwert[alt])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {daten.kipppunkte.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paar</TableHead>
                    <TableHead className="text-right">Kipppunkt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daten.kipppunkte.map((k) => (
                    <TableRow key={`${k.a}-${k.b}`}>
                      <TableCell>
                        {nameAlternative(datei, k.a)} / {nameAlternative(datei, k.b)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {kipppunkt(k.x, einheit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
