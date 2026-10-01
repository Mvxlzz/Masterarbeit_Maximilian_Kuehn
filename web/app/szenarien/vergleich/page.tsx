"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useFall } from "@/components/fall/fall-provider";
import { AltMarkierung, AlternativenLegende } from "@/components/sensitivitaet/alternativen-legende";
import { SeitenKopf } from "@/components/szenarien/teile";
import { useVergleich } from "@/components/szenarien/vergleich-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SzenarioVergleich } from "@/lib/api";
import { alternativen as altsAus } from "@/lib/fall";
import { CO2, LEER, differenz, gewicht, punkte, zahl } from "@/lib/format";
import {
  faktoren as faktorenAus,
  satzVergleich,
  schriftAufSkala,
  skalaFarbe,
  spaltenVergleich,
  szenarien as szenarienAus,
  vergleichTitel,
  zelltext,
} from "@/lib/szenarien";
import { cn } from "@/lib/utils";

type Punkt = { titel: string; wert: number | null; alt: string; diff: number | undefined };

function Marke({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full border border-border px-1.5 font-mono text-[10px] font-medium uppercase text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}

function Punktdiagramm({
  vergleich,
  spalten,
  namen,
  alle,
}: {
  vergleich: SzenarioVergleich[];
  spalten: string[];
  namen: Record<string, string>;
  alle: string[];
}) {
  const titel = vergleich.map(vergleichTitel);
  const reihen = spalten.map((a) => ({
    alt: a,
    // Jede Reihe enthält alle Zeilen, damit die Reihenfolge der Kategorien der Reihenfolge der Szenarien folgt;
    // ausgeschlossene Alternativen haben keinen Wert und werden nicht gezeichnet.
    daten: vergleich.map((v): Punkt => ({
      titel: vergleichTitel(v),
      wert: v.ergebnis?.nutzwert[a] ?? null,
      alt: a,
      diff: v.differenz[a],
    })),
  }));
  const hoehe = 56 + 30 * titel.length;
  const anders = vergleich.filter((v) => v.anderer_sieger).map(vergleichTitel);

  return (
    <div
      role="img"
      aria-label={`Punktdiagramm Gesamtnutzwert je Szenario und Alternative, ${titel.length} Zeilen. ${anders.length ? `Andere Alternative auf Rang 1 in ${anders.join(", ")}.` : ""}`}
    >
      <ResponsiveContainer width="100%" height={hoehe}>
        <ScatterChart margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--linie)" strokeDasharray="3 3" horizontal={false} />
          {anders.map((t) => (
            <ReferenceArea
              key={t}
              y1={t}
              y2={t}
              yAxisId="sz"
              fill="var(--flaeche-zweit)"
              fillOpacity={1}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ))}
          <XAxis
            type="number"
            dataKey="wert"
            domain={[-3, 103]}
            ticks={[0, 20, 40, 60, 80, 100]}
            allowDataOverflow
            orientation="top"
            tickFormatter={(v) => zahl(Number(v), 0)}
            stroke="var(--text-gedaempft)"
            fontSize={11}
            label={{ value: "Gesamtnutzwert [Punkte]", position: "insideTopRight", offset: -2, fontSize: 11, fill: "var(--text-gedaempft)" }}
          />
          <YAxis
            yAxisId="sz"
            type="category"
            dataKey="titel"
            allowDuplicatedCategory={false}
            reversed
            ticks={titel}
            width={230}
            interval={0}
            stroke="var(--text-gedaempft)"
            fontSize={11}
            tickFormatter={(t: string) => (t.length > 34 ? `${t.slice(0, 33)}…` : t)}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as Punkt | undefined) : undefined;
              if (!p || p.wert === null) return null;
              return (
                <div className="rounded-md border border-border bg-[var(--flaeche)] px-2.5 py-1.5 text-xs shadow-sm">
                  <p className="font-medium">{p.titel}</p>
                  <p>
                    {namen[p.alt] ?? p.alt}: <span className="font-mono">{punkte(p.wert)}</span>
                  </p>
                  <p className="text-muted-foreground">zum Basisfall: {differenz(p.diff)}</p>
                </div>
              );
            }}
          />
          {reihen.map((r) => (
            <Scatter
              key={r.alt}
              yAxisId="sz"
              name={namen[r.alt] ?? r.alt}
              data={r.daten}
              isAnimationActive={false}
              shape={(props: { cx?: number; cy?: number; payload?: Punkt }) =>
                props.payload?.wert == null || props.cx === undefined || Number.isNaN(props.cx) ? (
                  <g />
                ) : (
                <g>
                  <circle cx={props.cx} cy={props.cy} r={8} fill="transparent" />
                  <AltMarkierung
                    schluessel={r.alt}
                    x={props.cx ?? 0}
                    y={props.cy ?? 0}
                    size={10}
                    alle={alle}
                  />
                </g>
                )
              }
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function PunktTabelle({
  vergleich,
  spalten,
  namen,
}: {
  vergleich: SzenarioVergleich[];
  spalten: string[];
  namen: Record<string, string>;
}) {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Tabelle Gesamtnutzwerte je Szenario" tabIndex={0}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="px-2 py-2 font-medium">Szenario</th>
            {spalten.map((a) => (
              <th key={a} scope="col" className="px-2 py-2 text-right font-medium">
                {namen[a]} [Punkte]
              </th>
            ))}
            {spalten.map((a) => (
              <th key={`d-${a}`} scope="col" className="px-2 py-2 text-right font-medium">
                zum Basisfall {namen[a]}
              </th>
            ))}
            <th scope="col" className="px-2 py-2 font-medium">Rang 1</th>
          </tr>
        </thead>
        <tbody>
          {vergleich.map((v) => (
            <tr key={v.szenario ?? "basis"} className={cn("border-b border-border", v.anderer_sieger && "bg-[var(--flaeche-zweit)]")}>
              <th scope="row" className="px-2 py-1.5 text-left font-normal">{vergleichTitel(v)}</th>
              {spalten.map((a) => (
                <td key={a} className="px-2 py-1.5 text-right font-mono tabular-nums">{zelltext(v, a)}</td>
              ))}
              {spalten.map((a) => (
                <td key={`d-${a}`} className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {v.differenz[a] === undefined ? LEER : differenz(v.differenz[a], "")}
                </td>
              ))}
              <td className="px-2 py-1.5">
                {v.ergebnis?.rangfolge[0] ? namen[v.ergebnis.rangfolge[0]] : v.fehler ? "nicht auswertbar" : LEER}
                {v.anderer_sieger && <Marke label="anderer Sieger" className="ml-1.5" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heatmap({
  vergleich,
  spalten,
  namen,
}: {
  vergleich: SzenarioVergleich[];
  spalten: string[];
  namen: Record<string, string>;
}) {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Heatmap Szenario mal Alternative" tabIndex={0}>
      <table className="w-full border-separate border-spacing-[2px] text-sm" data-testid="heatmap">
        <caption className="sr-only">
          Gesamtnutzwert je Szenario und Alternative in Punkten, darunter die Differenz zum Basisfall. K.O. heißt
          ausgeschlossen.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="px-2 py-1.5 text-left font-medium">Szenario</th>
            {spalten.map((a) => (
              <th key={a} scope="col" className="w-[22%] px-2 py-1.5 text-center font-medium">{namen[a] ?? a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vergleich.map((v) => (
            <tr key={v.szenario ?? "basis"} data-testid={`heatmap-${v.szenario ?? "basis"}`}>
              <th scope="row" className="px-2 py-1 text-left align-middle font-normal">
                <span className="flex flex-wrap items-center gap-x-1.5">
                  {vergleichTitel(v)}
                  {v.anderer_sieger && <Marke label="anderer Sieger" />}
                </span>
              </th>
              {!v.ergebnis ? (
                <td colSpan={spalten.length} className="rounded-sm bg-[var(--flaeche-zweit)] px-2 py-1.5 text-[var(--status-ausschluss-fg)]">
                  nicht auswertbar: {v.fehler}
                </td>
              ) : (
                spalten.map((a) => {
                  const w = v.ergebnis!.nutzwert[a];
                  if (w === undefined) {
                    return (
                      <td
                        key={a}
                        className="rounded-sm bg-[var(--flaeche-zweit)] px-2 py-1.5 text-center font-mono text-[13px] font-medium text-[var(--status-ausschluss-fg)]"
                        title={`${vergleichTitel(v)}, ${namen[a]}: ausgeschlossen`}
                      >
                        K.O.
                      </td>
                    );
                  }
                  const rang1 = v.ergebnis!.rangfolge[0] === a;
                  return (
                    <td
                      key={a}
                      className="rounded-sm px-2 py-1 text-center font-mono tabular-nums"
                      style={{ background: skalaFarbe(w), color: schriftAufSkala(w) }}
                      title={`${vergleichTitel(v)}, ${namen[a]}: ${punkte(w)}, zum Basisfall ${differenz(v.differenz[a])}`}
                    >
                      <span className={cn("text-[13px]", rang1 && "font-bold")}>{zahl(w, 2)}</span>
                      {v.szenario !== null && v.differenz[a] !== undefined && (
                        <span className="block text-[11px]">{differenz(v.differenz[a], "")}</span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
        <span>0 Punkte</span>
        <span
          className="h-2.5 w-40 rounded-sm"
          style={{ background: `linear-gradient(to right, ${skalaFarbe(0)}, ${skalaFarbe(100)})` }}
        />
        <span>100 Punkte</span>
        <span className="ml-4 inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-[var(--flaeche-zweit)] ring-1 ring-border" /> K.O.
          ausgeschlossen
        </span>
        <span className="ml-4">fett: Rang 1 im Szenario</span>
      </div>
    </div>
  );
}

/** Tabelle 20: Gewichte, Ausgeschlossene, Kosten, Treibhauspotenzial, Gesamtnutzwerte, Rangfolge. */
function Tabelle20({
  vergleich,
  spalten,
  namen,
  faktorNamen,
}: {
  vergleich: SzenarioVergleich[];
  spalten: string[];
  namen: Record<string, string>;
  faktorNamen: (sz: string | null) => string;
}) {
  const kopf = "px-2 py-2 text-right font-medium";
  return (
    <div className="overflow-x-auto" role="region" aria-label="Tabelle 20 Szenarien" tabIndex={0}>
      <table className="w-max min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left align-bottom">
            <th scope="col" className="px-2 py-2 font-medium">Szenario</th>
            <th scope="col" className="px-2 py-2 font-medium">Einflussfaktoren</th>
            <th scope="col" className="px-2 py-2 font-medium">Gewichte t / ök / öl</th>
            <th scope="col" className="px-2 py-2 font-medium">Ausgeschlossen</th>
            {spalten.map((a) => (
              <th key={`k-${a}`} scope="col" className={kopf}>Kosten {namen[a]} [€]</th>
            ))}
            {spalten.map((a) => (
              <th key={`e-${a}`} scope="col" className={kopf}>Treibhauspotenzial {namen[a]} [{CO2}]</th>
            ))}
            {spalten.map((a) => (
              <th key={`n-${a}`} scope="col" className={kopf}>Gesamtnutzwert {namen[a]} [Punkte]</th>
            ))}
            <th scope="col" className="px-2 py-2 font-medium">Rangfolge</th>
          </tr>
        </thead>
        <tbody>
          {vergleich.map((v) => {
            const e = v.ergebnis;
            return (
              <tr key={v.szenario ?? "basis"} className="border-b border-border align-top">
                <th scope="row" className="max-w-[240px] px-2 py-1.5 text-left font-normal">{vergleichTitel(v)}</th>
                <td className="max-w-[260px] px-2 py-1.5 text-muted-foreground">{faktorNamen(v.szenario)}</td>
                {!e ? (
                  <td colSpan={3 + spalten.length * 3} className="px-2 py-1.5 text-[var(--status-ausschluss-fg)]">
                    nicht auswertbar: {v.fehler}
                  </td>
                ) : (
                  <>
                    <td className="px-2 py-1.5 font-mono tabular-nums">
                      {(["tech", "oekon", "oekol"] as const).map((d) => gewicht(e.gewichte[d])).join(" / ")}
                    </td>
                    <td className="px-2 py-1.5">
                      {spalten.filter((a) => a in e.ausgeschlossen).map((a) => namen[a]).join(", ") || LEER}
                    </td>
                    {spalten.map((a) => (
                      <td key={`k-${a}`} className="px-2 py-1.5 text-right font-mono tabular-nums">{zahl(e.kosten[a])}</td>
                    ))}
                    {spalten.map((a) => (
                      <td key={`e-${a}`} className="px-2 py-1.5 text-right font-mono tabular-nums">{zahl(e.co2[a])}</td>
                    ))}
                    {spalten.map((a) => (
                      <td key={`n-${a}`} className="px-2 py-1.5 text-right font-mono tabular-nums">{zahl(e.nutzwert[a])}</td>
                    ))}
                    <td className="px-2 py-1.5">{e.rangfolge.map((a) => namen[a]).join(" > ")}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function VergleichPage() {
  const { datei } = useFall();
  const { vergleich, laedt, fehler } = useVergleich();
  const alts = useMemo(() => (datei ? altsAus(datei) : []), [datei]);
  const szen = useMemo(() => (datei ? szenarienAus(datei) : []), [datei]);
  const fakt = useMemo(() => (datei ? faktorenAus(datei) : []), [datei]);

  if (!datei) return null;
  const namen = Object.fromEntries(alts.map((a) => [a.schluessel, a.name]));
  const alle = alts.map((a) => a.schluessel);
  const spalten = vergleich ? spaltenVergleich(vergleich, alle) : [];
  const faktorNamen = (sz: string | null) => {
    const s = szen.find((x) => x.schluessel === sz);
    if (!s || s.faktoren.length === 0) return LEER;
    return s.faktoren.map((k) => fakt.find((f) => f.schluessel === k)?.name ?? k).join(", ");
  };
  const nichtAuswertbar = (vergleich ?? []).filter((v) => !v.ergebnis);

  return (
    <>
      <SeitenKopf
        titel="Vergleich der Szenarien"
        abschnitt="Abschnitt 4.5.4, Tabelle 20"
        text="Wie sich Rangfolge und Gesamtnutzwerte gegenüber dem Basisfall ändern. Das sind Bewertungen unter den Annahmen des jeweiligen Szenarios."
      />
      {fehler && (
        <p role="alert" className="mb-4 rounded-md border border-[var(--status-ausschluss-fg)]/40 px-3 py-2 text-sm text-[var(--status-ausschluss-fg)]">
          {fehler}
        </p>
      )}
      {!vergleich && laedt && <Skeleton className="h-96 w-full" />}
      {vergleich && (
        <div className="flex flex-col gap-8">
          <p className="max-w-[80ch] text-sm blocksatz" data-testid="vergleich-satz">
            {satzVergleich(vergleich, namen)}
          </p>
          {nichtAuswertbar.map((v) => (
            <p key={v.szenario} role="alert" className="text-sm text-[var(--status-ausschluss-fg)]">
              {vergleichTitel(v)} ist nicht auswertbar: {v.fehler}
            </p>
          ))}

          <section aria-labelledby="punkt-titel" className="rounded-lg border border-border bg-card p-4">
            <h2 id="punkt-titel" className="mb-1 text-lg font-medium">Gesamtnutzwerte je Szenario</h2>
            <p className="mb-3 max-w-[76ch] text-sm text-muted-foreground blocksatz">
              Eine Zeile je Szenario, Form und Farbe je Alternative. Grau hinterlegt: Szenarien, in denen eine andere
              Alternative als im Basisfall auf Rang 1 liegt. Differenzen zum Basisfall entstehen aus ungerundeten Werten.
            </p>
            <div className="mb-3">
              <AlternativenLegende alternativen={alts.filter((a) => spalten.includes(a.schluessel))} />
            </div>
            <Tabs defaultValue="diagramm">
              <TabsList>
                <TabsTrigger value="diagramm">Diagramm</TabsTrigger>
                <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
              </TabsList>
              <TabsContent value="diagramm" className="mt-3">
                <Punktdiagramm vergleich={vergleich} spalten={spalten} namen={namen} alle={alle} />
              </TabsContent>
              <TabsContent value="tabelle" className="mt-3">
                <PunktTabelle vergleich={vergleich} spalten={spalten} namen={namen} />
              </TabsContent>
            </Tabs>
          </section>

          <section aria-labelledby="heatmap-titel" className="rounded-lg border border-border bg-card p-4">
            <h2 id="heatmap-titel" className="mb-1 text-lg font-medium">Szenario × Alternative</h2>
            <p className="mb-3 max-w-[76ch] text-sm text-muted-foreground blocksatz">
              Je dunkler die Zelle, desto höher der Gesamtnutzwert. Unter der Zahl steht die Differenz zum Basisfall in
              Punkten. Die Tabelle entspricht Tabelle 20 der Arbeit.
            </p>
            <Tabs defaultValue="heatmap">
              <TabsList>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
              </TabsList>
              <TabsContent value="heatmap" className="mt-3">
                <Heatmap vergleich={vergleich} spalten={spalten} namen={namen} />
              </TabsContent>
              <TabsContent value="tabelle" className="mt-3">
                <Tabelle20 vergleich={vergleich} spalten={spalten} namen={namen} faktorNamen={faktorNamen} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      )}
    </>
  );
}
