"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, ChartScatter, ListPlus } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Leerzustand } from "@/components/leerzustand";
import { WasserfallSektion } from "@/components/ergebnis/wasserfall";
import { ZielkonfliktSektion } from "@/components/ergebnis/zielkonflikt";
import { Katex } from "@/components/katex";
import { useAktivesSzenario, useProjekte } from "@/components/projekte-provider";
import { aktivesSzenario, szenarioTitel } from "@/lib/projekte";
import { ApiFehler, bewerten, type FallDatei, type ModellErgebnis, type Schritt } from "@/lib/api";
import { co2, euro, punkte, rechenwert, zahl } from "@/lib/format";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AltInfo = { schluessel: string; name: string; art: string };

const DOT: Record<string, string> = {
  intern: "var(--alt-intern)",
  extern: "var(--alt-extern)",
  neuteil: "var(--alt-neuteil)",
  ausscheiden: "var(--alt-ausscheiden)",
};

/** Formelzeichen für eingesetzte Werte (wie in formel_latex / KERNFORMELN). */
const SYMBOL_LATEX: Record<string, string> = {
  w_tech: String.raw`w_{\text{tech}}`,
  w_oekon: String.raw`w_{\text{ökon}}`,
  w_oekol: String.raw`w_{\text{ökol}}`,
  n_tech: String.raw`n_{a,\text{tech}}`,
  n_oekon: String.raw`n_{a,\text{ökon}}`,
  n_oekol: String.raw`n_{a,\text{ökol}}`,
  s: String.raw`s_{\text{tech}}`,
  s_ohne_Verfahren: String.raw`s_{\text{ohne Verfahren}}`,
  x: "x",
  x_min: String.raw`x_{\min}`,
  x_max: String.raw`x_{\max}`,
  K_max: String.raw`K_{\max}`,
  K_min: String.raw`K_{\min}`,
  E_max: String.raw`E_{\max}`,
  E_min: String.raw`E_{\min}`,
  K_R: String.raw`K_{\text{Neu}}`,
  E_R: String.raw`E_{\text{Neu}}`,
  p: "p_a",
  t_a: "t_a",
  t_R: String.raw`t_{\text{Neu}}`,
};

/** Ergebnis der Kennzahlen (Punkte) mit zwei Nachkommastellen wie im Rest der App. */
function ergebnisAnzeige(schritt: Schritt): string {
  const punkteBereiche = new Set([
    "nutzwert",
    "beitrag",
    "normalisierung",
    "technik",
  ]);
  if (punkteBereiche.has(schritt.bereich) || schritt.einheit === "Punkte") {
    return zahl(schritt.ergebnis, 2);
  }
  return rechenwert(schritt.ergebnis, schritt.einheit);
}

function altListe(datei: FallDatei | null): AltInfo[] {
  const modell = datei?.modell as { alternativen?: AltInfo[] } | undefined;
  return modell?.alternativen ?? [];
}

/** Sucht die Rechenweg-Zeile, deren Ergebnis (annähernd) dem angezeigten Wert entspricht. */
function findeSchritt(
  rechenweg: Schritt[],
  alt: string,
  wert: number | undefined,
  bevorzugt?: string
): Schritt | undefined {
  if (wert === undefined || Number.isNaN(wert)) return undefined;
  const kandidaten = rechenweg.filter(
    (s) => s.alternative === alt && Math.abs(s.ergebnis - wert) < 1e-6
  );
  if (kandidaten.length === 0) return undefined;
  if (bevorzugt) {
    const treffer = kandidaten.find((s) => s.bereich === bevorzugt);
    if (treffer) return treffer;
  }
  return kandidaten[kandidaten.length - 1];
}

function BeitragBalken({
  tech,
  oekon,
  oekol,
}: {
  tech: number;
  oekon: number;
  oekol: number;
}) {
  const data = [{ name: "beitrag", tech, oekon, oekol }];
  return (
    <ResponsiveContainer width="100%" height={18}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis type="category" dataKey="name" hide />
        <Bar dataKey="tech" stackId="a" fill="var(--dim-tech)" isAnimationActive={false} />
        <Bar dataKey="oekon" stackId="a" fill="var(--dim-oekon)" isAnimationActive={false} />
        <Bar
          dataKey="oekol"
          stackId="a"
          fill="var(--dim-oekol)"
          radius={[0, 2, 2, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

type Auswahl = { schritt: Schritt; zeile: string; altName: string };

function RechenwegPanel({ auswahl }: { auswahl: Auswahl | null }) {
  return (
    <div>
      <h2 className="mb-0.5 text-base font-semibold">Rechenweg</h2>
      {!auswahl ? (
        <p className="text-sm text-muted-foreground">
          Klicken Sie auf eine Zahl in der Tabelle, um ihren Rechenweg zu sehen.
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {auswahl.zeile} · {auswahl.altName}
          </p>
          <div className="mb-4 rounded-lg border border-border bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              {auswahl.schritt.nummer ? (
                <span className="font-mono font-semibold text-primary">
                  {auswahl.schritt.nummer}
                </span>
              ) : (
                <span />
              )}
              <span>{auswahl.schritt.abschnitt}</span>
            </div>
            {auswahl.schritt.formel_latex && (
              <div className="mb-2.5 text-sm">
                <Katex>
                  {(auswahl.schritt.links_latex ? `${auswahl.schritt.links_latex} = ` : "") +
                    auswahl.schritt.formel_latex}
                </Katex>
              </div>
            )}
            <div className="border-t border-border pt-2.5 text-sm leading-relaxed">
              <Katex>{auswahl.schritt.eingesetzt_latex}</Katex>
              <span> = </span>
              <strong className="font-mono">
                {ergebnisAnzeige(auswahl.schritt)}
              </strong>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-1.5 text-left font-medium">Eingesetzt</th>
                <th className="pb-1.5 text-right font-medium">Wert</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(auswahl.schritt.werte).map(([k, v]) => (
                <tr key={k} className="border-t border-border">
                  <td className="py-1.5">
                    {SYMBOL_LATEX[k] ? (
                      <Katex className="text-xs">{SYMBOL_LATEX[k]}</Katex>
                    ) : (
                      <span className="font-mono">{k}</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-mono">{rechenwert(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 rounded-md border border-[var(--status-hinweis-rand)] bg-[var(--status-hinweis-bg)] px-3 py-2 text-xs text-[var(--status-hinweis-fg)]">
            Die Bewertung gilt unter den eingegebenen Annahmen. Stabilität prüfen Sie unter
            Sensitivität (Kipppunkte).
          </p>
        </>
      )}
    </div>
  );
}

export default function ErgebnisPage() {
  const { offenesProjekt, ladeProjektdatei, aktualisiereErgebnis } = useProjekte();
  const [datei, setDatei] = useState<FallDatei | null>(null);
  const [ergebnis, setErgebnis] = useState<ModellErgebnis | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);

  const projektId = offenesProjekt?.id;
  const { szenario } = useAktivesSzenario();
  const szenarioWahl = offenesProjekt?.szenario;

  useEffect(() => {
    if (!projektId) return;
    let aktuell = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLaedt(true);
    setFehler("");
    setAuswahl(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      try {
        const d = await ladeProjektdatei(projektId);
        // Aktives Szenario aus der geladenen Datei, die Kachel zeigt immer den Basisfall
        const sz = aktivesSzenario(szenarioWahl, d);
        const e = await bewerten(d, sz);
        if (!aktuell) return;
        setDatei(d);
        setErgebnis(e);
        if (sz === null) aktualisiereErgebnis(projektId, e);
        else void bewerten(d).then((basis) => aktualisiereErgebnis(projektId, basis)).catch(() => {});
      } catch (err) {
        if (!aktuell) return;
        setFehler(
          err instanceof ApiFehler || err instanceof Error
            ? err.message
            : "Die Bewertung ist fehlgeschlagen."
        );
      } finally {
        if (aktuell) setLaedt(false);
      }
    })();
    return () => {
      aktuell = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projektId, szenario]);

  const alternativen = useMemo(() => altListe(datei), [datei]);
  const nameVon = useMemo(
    () => (schluessel: string) => alternativen.find((a) => a.schluessel === schluessel)?.name ?? schluessel,
    [alternativen]
  );

  function auswaehlen(zeile: string, alt: string, wert: number | undefined, bevorzugt?: string) {
    if (!ergebnis) return;
    const schritt = findeSchritt(ergebnis.rechenweg, alt, wert, bevorzugt);
    if (!schritt) return;
    setAuswahl({ schritt, zeile, altName: nameVon(alt) });
  }

  // Beim Laden die Rangfolge-1-Formel voreinstellen.
  useEffect(() => {
    if (!ergebnis || auswahl) return;
    const rang1 = ergebnis.rangfolge[0];
    if (!rang1) return;
    const schritt = findeSchritt(ergebnis.rechenweg, rang1, ergebnis.nutzwert[rang1], "nutzwert");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (schritt) setAuswahl({ schritt, zeile: "Gesamtnutzwert", altName: nameVon(rang1) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ergebnis]);

  if (!offenesProjekt) {
    return (
      <AppShell>
        <header className="mb-6">
          <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Ergebnis</h1>
          <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
            Rangfolge der Alternativen nach Gesamtnutzwert, Beitrag je Dimension und Rechenweg jeder
            Zahl.
          </p>
        </header>
        <Leerzustand
          icon={<BarChart3 className="size-[18px]" strokeWidth={1.5} />}
          titel="Kein Projekt geöffnet"
          text="Das Ergebnis zeigt die Bewertung der Alternativen eines Projekts. Öffnen Sie ein Projekt oder legen Sie ein neues an, dann erscheinen hier seine Daten."
        />
      </AppShell>
    );
  }

  const rang1 = ergebnis?.rangfolge[0];

  const zeilen = ergebnis
    ? [
        {
          label: "Technischer Dimensionswert [1–5]",
          get: (a: string) => ergebnis.s_tech[a],
          format: (v: number) => zahl(v, 2),
          bevorzugt: "technik",
        },
        {
          label: "Kosten [€]",
          get: (a: string) => ergebnis.kosten[a],
          format: euro,
          bevorzugt: "summe",
        },
        {
          label: "Treibhauspotenzial [kg CO₂-Äq]",
          get: (a: string) => ergebnis.co2[a],
          format: co2,
          bevorzugt: "summe",
        },
        {
          label: "Punkte technisch",
          get: (a: string) => ergebnis.n_tech[a],
          format: punkte,
          bevorzugt: "normalisierung",
        },
        {
          label: "Punkte ökonomisch",
          get: (a: string) => ergebnis.n_oekon[a],
          format: punkte,
          bevorzugt: "normalisierung",
        },
        {
          label: "Punkte ökologisch",
          get: (a: string) => ergebnis.n_oekol[a],
          format: punkte,
          bevorzugt: "normalisierung",
        },
        {
          label: "Gesamtnutzwert [Punkte]",
          get: (a: string) => ergebnis.nutzwert[a],
          format: punkte,
          bevorzugt: "nutzwert",
          betont: true,
        },
      ]
    : [];

  const positionsnamen = (pos: Record<string, Record<string, number>>): string[] => {
    const namen: string[] = [];
    for (const alt of ergebnis?.alternativen ?? []) {
      for (const n of Object.keys(pos[alt] ?? {})) {
        if (!namen.includes(n)) namen.push(n);
      }
    }
    return namen;
  };

  const hatPositionen =
    positionsnamen(ergebnis?.kosten_pos ?? {}).length + positionsnamen(ergebnis?.co2_pos ?? {}).length > 0;

  return (
    <AppShell panel={ergebnis && <RechenwegPanel auswahl={auswahl} />}>
      <header className="mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Ergebnis</h1>
            <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
              Rangfolge der Alternativen nach Gesamtnutzwert, Beitrag je Dimension und Rechenweg
              jeder Zahl.
            </p>
            <p className="mt-2 text-xs text-muted-foreground" data-testid="ergebnis-szenario">
              Szenario: <span className="font-medium text-foreground">{szenarioTitel(szenario, datei)}</span>.
              Sie wechseln es oben im Pfad.
            </p>
          </div>
          <span
            className="hidden shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex"
            title="Hintergrund und Formeln in der Masterarbeit"
          >
            Abschnitt 4.4
          </span>
        </div>
      </header>

      {laedt && <p className="text-sm text-muted-foreground">Bewertung wird geladen …</p>}
      {fehler && (
        <p className="mb-4 rounded-md border border-[var(--status-ausschluss-rand)] bg-[var(--status-ausschluss-bg)] px-3 py-2 text-sm text-[var(--status-ausschluss-fg)]">
          {fehler}
        </p>
      )}

      {ergebnis && (
        <Tabs defaultValue="ueberblick">
          <TabsList variant="line" className="mb-5">
            <TabsTrigger value="ueberblick">Überblick</TabsTrigger>
            <TabsTrigger value="positionen">Positionen</TabsTrigger>
            <TabsTrigger value="zielkonflikt">Zielkonflikt</TabsTrigger>
          </TabsList>

          <TabsContent value="ueberblick" className="flex flex-col gap-7">
            <p className="text-sm">
              {szenario ? `Unter den Annahmen des Szenarios ${szenario}` : "Unter den eingegebenen Werten"}{" "}
              erreicht {rang1 ? nameVon(rang1) : "keine Alternative"}{" "}
              den höchsten Gesamtnutzwert.
            </p>

            <section aria-label="Kennzahlen je Alternative" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {alternativen.map((a) => {
                const ausgeschlossen = ergebnis.ausgeschlossen[a.schluessel];
                return (
                  <div
                    key={a.schluessel}
                    className={cn(
                      "rounded-lg border border-border bg-card p-3.5",
                      ausgeschlossen && "bg-[var(--status-ausschluss-bg)]"
                    )}
                  >
                    <div className="mb-2 flex items-start gap-2">
                      <span
                        className="mt-1 size-2.5 shrink-0 rounded-full"
                        style={{ background: DOT[a.schluessel] ?? "var(--text-gedaempft)" }}
                      />
                      <span
                        className={cn(
                          "text-xs text-muted-foreground",
                          ausgeschlossen && "text-[var(--status-ausschluss-fg)] line-through"
                        )}
                      >
                        {a.name}
                      </span>
                    </div>
                    {ausgeschlossen ? (
                      <>
                        <span className="inline-flex h-5 items-center rounded-full border border-[var(--status-ausschluss-rand)] bg-[var(--status-ausschluss-bg)] px-2 text-[11px] font-medium uppercase text-[var(--status-ausschluss-fg)]">
                          Ausgeschlossen
                        </span>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          K.O. im Gate: {ausgeschlossen}
                        </p>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            auswaehlen("Gesamtnutzwert", a.schluessel, ergebnis.nutzwert[a.schluessel], "nutzwert")
                          }
                          className="font-mono text-2xl font-semibold leading-tight hover:text-primary"
                        >
                          {zahl(ergebnis.nutzwert[a.schluessel])}
                          <span className="ml-1 text-sm font-medium text-muted-foreground">Punkte</span>
                        </button>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          <strong className="font-medium text-foreground">
                            {euro(ergebnis.kosten[a.schluessel])}
                          </strong>{" "}
                          · {co2(ergebnis.co2[a.schluessel])}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </section>

            <section aria-labelledby="rang-titel">
              <h2 id="rang-titel" className="mb-3 text-lg font-semibold">
                Rangfolge und Beitrag je Dimension
              </h2>
              <div className="flex flex-col gap-2.5">
                {ergebnis.rangfolge.map((alt, i) => (
                  <div key={alt} className="grid grid-cols-[24px_12px_minmax(140px,200px)_64px_1fr] items-center gap-2.5 border-b border-border pb-2 last:border-0">
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: DOT[alt] ?? "var(--text-gedaempft)" }}
                    />
                    <span className="truncate text-sm">{nameVon(alt)}</span>
                    <span className="text-right font-mono text-sm font-semibold tabular-nums">
                      {zahl(ergebnis.nutzwert[alt])}
                    </span>
                    <BeitragBalken
                      tech={ergebnis.beitrag[alt]?.tech ?? 0}
                      oekon={ergebnis.beitrag[alt]?.oekon ?? 0}
                      oekol={ergebnis.beitrag[alt]?.oekol ?? 0}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2.5 rounded-sm" style={{ background: "var(--dim-tech)" }} />
                  technisch
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2.5 rounded-sm" style={{ background: "var(--dim-oekon)" }} />
                  ökonomisch
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2.5 rounded-sm" style={{ background: "var(--dim-oekol)" }} />
                  ökologisch
                </span>
              </div>
            </section>

            <section aria-labelledby="tabelle-titel">
              <h2 id="tabelle-titel" className="mb-3 text-lg font-semibold">
                Rohwerte und Punkte
              </h2>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table className="font-mono text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-sans">Größe</TableHead>
                      {ergebnis.alternativen.map((a) => (
                        <TableHead key={a} className="text-right font-sans">
                          {nameVon(a)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zeilen.map((z) => (
                      <TableRow key={z.label}>
                        <TableCell className="font-sans">{z.label}</TableCell>
                        {ergebnis.alternativen.map((a) => {
                          const wert = z.get(a);
                          return (
                            <TableCell key={a} className="text-right">
                              <button
                                type="button"
                                onClick={() => auswaehlen(z.label, a, wert, z.bevorzugt)}
                                className={cn(
                                  "hover:text-primary",
                                  z.betont && "font-semibold",
                                  auswahl?.zeile === z.label && auswahl.altName === nameVon(a) && "text-primary"
                                )}
                              >
                                {z.format(wert as number)}
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="positionen" className="flex flex-col gap-7">
            {!hatPositionen ? (
              <Leerzustand
                icon={<ListPlus className="size-[18px]" strokeWidth={1.5} />}
                titel="Noch keine Positionen"
                text="Dieses Projekt hat weder Kosten- noch CO₂-Positionen. Legen Sie sie unter „Fall bearbeiten“ auf der Seite Formeln an, dann erscheinen hier die Positionen je Alternative und der Wasserfall."
                aktionen={
                  <Button size="sm" nativeButton={false} render={<Link href="/fall/formeln" />}>
                    Zu den Formeln
                  </Button>
                }
              />
            ) : (
              <>
                <WasserfallSektion
                  ergebnis={ergebnis}
                  nameVon={nameVon}
                  gewaehlt={auswahl}
                  onWaehle={(schritt, zeile, alt) => setAuswahl({ schritt, zeile, altName: nameVon(alt) })}
                />
                <section>
                  <h2 className="mb-3 text-lg font-semibold">Kostenpositionen [€]</h2>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table className="font-mono text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-sans">Position</TableHead>
                          {ergebnis.alternativen.map((a) => (
                            <TableHead key={a} className="text-right font-sans">
                              {nameVon(a)}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positionsnamen(ergebnis.kosten_pos).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={ergebnis.alternativen.length + 1} className="font-sans text-muted-foreground">
                              Keine Positionen in dieser Dimension.
                            </TableCell>
                          </TableRow>
                        )}
                        {positionsnamen(ergebnis.kosten_pos).map((n) => (
                          <TableRow key={n}>
                            <TableCell className="font-sans">{n}</TableCell>
                            {ergebnis.alternativen.map((a) => (
                              <TableCell key={a} className="text-right">
                                {euro(ergebnis.kosten_pos[a]?.[n])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
                <section>
                  <h2 className="mb-3 text-lg font-semibold">CO₂-Positionen [kg CO₂-Äq]</h2>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table className="font-mono text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-sans">Position</TableHead>
                          {ergebnis.alternativen.map((a) => (
                            <TableHead key={a} className="text-right font-sans">
                              {nameVon(a)}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positionsnamen(ergebnis.co2_pos).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={ergebnis.alternativen.length + 1} className="font-sans text-muted-foreground">
                              Keine Positionen in dieser Dimension.
                            </TableCell>
                          </TableRow>
                        )}
                        {positionsnamen(ergebnis.co2_pos).map((n) => (
                          <TableRow key={n}>
                            <TableCell className="font-sans">{n}</TableCell>
                            {ergebnis.alternativen.map((a) => (
                              <TableCell key={a} className="text-right">
                                {co2(ergebnis.co2_pos[a]?.[n])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          <TabsContent value="zielkonflikt">
            {ergebnis.alternativen.length < 2 ? (
              <Leerzustand
                icon={<ChartScatter className="size-[18px]" strokeWidth={1.5} />}
                titel="Zu wenige zulässige Alternativen"
                text="Ein Zielkonflikt braucht mindestens zwei zulässige Alternativen. Die übrigen sind im Gate ausgeschlossen oder fehlen im Fall; die Gründe stehen im Überblick."
              />
            ) : !hatPositionen ? (
              <Leerzustand
                icon={<ListPlus className="size-[18px]" strokeWidth={1.5} />}
                titel="Noch keine Positionen"
                text="Dieses Projekt hat weder Kosten- noch CO₂-Positionen. Legen Sie sie unter „Fall bearbeiten“ auf der Seite Formeln an, dann erscheinen hier Kosten und Treibhauspotenzial je Alternative."
                aktionen={
                  <Button size="sm" nativeButton={false} render={<Link href="/fall/formeln" />}>
                    Zu den Formeln
                  </Button>
                }
              />
            ) : (
              <ZielkonfliktSektion
                ergebnis={ergebnis}
                nameVon={nameVon}
                gewaehlt={auswahl}
                onWaehle={(schritt, zeile, altName) => setAuswahl({ schritt, zeile, altName })}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
