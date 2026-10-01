"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Table2 } from "lucide-react";

import { HerkunftBadge } from "@/components/fall/herkunft-badge";
import { useFall } from "@/components/fall/fall-provider";
import { Leerzustand } from "@/components/leerzustand";
import { useAktivesSzenario, useProjekte } from "@/components/projekte-provider";
import { SeitenKopf } from "@/components/szenarien/teile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiFehler, bewerten } from "@/lib/api";
import { felderNachGruppe, herkunftZaehlen } from "@/lib/blaetter";
import { felder as felderAus, meldungenJeOrt, strafeMaxName } from "@/lib/fall";
import { LEER, UNBEGRENZT, kompakt } from "@/lib/format";
import { szenarioTitel } from "@/lib/projekte";
import { cn } from "@/lib/utils";

const TITEL = "Datenblatt";
const ABSCHNITT = "Tabellen 6, 11 und 13";

function wertText(wert: number | null | undefined, unbegrenzt: boolean): string {
  if (wert === null || wert === undefined) return unbegrenzt ? UNBEGRENZT : LEER;
  return kompakt(wert);
}

/** Alle Felder des Falls nur lesend, mit Herkunft, Quelle, Spanne und dem Wert im aktiven Szenario. */
export default function DatenblattBlattPage() {
  const { offenesProjekt } = useProjekte();
  const { datei, meldungen } = useFall();
  const { szenario } = useAktivesSzenario();
  const [suche, setSuche] = useState("");
  const [szenarioWerte, setSzenarioWerte] = useState<Record<string, number | null> | null>(null);
  const [werteFehler, setWerteFehler] = useState<string | null>(null);

  // Werte im aktiven Szenario aus kern.modell über POST /bewerten; im Basisfall entfällt die Spalte
  useEffect(() => {
    if (!datei || szenario === null) return;
    let ab = false;
    bewerten(datei, szenario)
      .then((e) => {
        if (ab) return;
        setSzenarioWerte(e.werte);
        setWerteFehler(null);
      })
      .catch((e) => {
        if (ab) return;
        setSzenarioWerte(null);
        setWerteFehler(e instanceof ApiFehler ? e.message : "Die Werte im Szenario ließen sich nicht laden.");
      });
    return () => {
      ab = true;
    };
  }, [datei, szenario]);

  const alle = useMemo(() => (datei ? felderAus(datei) : []), [datei]);
  const zaehler = useMemo(() => herkunftZaehlen(alle), [alle]);
  const gruppen = useMemo(() => felderNachGruppe(alle, suche), [alle, suche]);
  const orte = useMemo(() => meldungenJeOrt(meldungen), [meldungen]);
  const obergrenze = datei ? strafeMaxName(datei) : "";
  const mitSzenario = szenario !== null && szenarioWerte !== null;
  const mitPruefung = alle.some((f) => (orte[`Feld ${f.bezeichnung}`] ?? []).length > 0);
  const spalten = 7 + (mitSzenario ? 1 : 0) + (mitPruefung ? 1 : 0);

  if (!offenesProjekt) {
    return (
      <>
        <SeitenKopf
          titel={TITEL}
          abschnitt={ABSCHNITT}
          text="Alle Felder des geöffneten Projekts mit Herkunft, Quelle und Spanne, nur lesend."
        />
        <Leerzustand
          icon={<Table2 className="size-[18px]" strokeWidth={1.5} />}
          titel="Kein Projekt geöffnet"
          text="Öffnen Sie ein Projekt unter Projekte, dann erscheinen hier seine Felder mit Herkunft, Quelle und Spanne."
        />
      </>
    );
  }

  return (
    <>
      <SeitenKopf
        titel={TITEL}
        abschnitt={ABSCHNITT}
        text={
          <>
            Alle Felder des Falls, nur lesend. Geändert werden sie unter{" "}
            <Link href="/fall/datenblatt" className="text-foreground underline underline-offset-2">
              Fall bearbeiten, Reiter Datenblatt
            </Link>
            . Ein geänderter Wert wechselt dort auf die Herkunft Nutzerangabe (N).
          </>
        }
      />
      <p className="-mt-4 mb-5 text-xs text-muted-foreground" data-testid="datenblatt-szenario">
        Szenario:{" "}
        <span className="font-medium text-foreground">{szenarioTitel(szenario, datei)}</span>. Sie wechseln es oben
        im Pfad.
      </p>

      {!datei ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="grid w-72 gap-1.5" role="search">
              <Label htmlFor="blatt-suche">Suche</Label>
              <Input
                id="blatt-suche"
                type="search"
                placeholder="Name, Bezeichnung, Quelle…"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
              />
            </div>
            <p className="font-mono text-xs text-muted-foreground" data-testid="datenblatt-zaehler">
              {zaehler.gesamt} Felder · {zaehler.L} Literatur (L) · {zaehler.A} Annahme (A) · {zaehler.N}{" "}
              Nutzerangabe (N) · {zaehler.mitSpanne} mit Spanne
            </p>
          </div>
          {werteFehler && (
            <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
              {werteFehler}
            </div>
          )}

          <div
            className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]"
            role="group"
            tabIndex={0}
            aria-label="Datenblatt, waagerecht scrollbar"
          >
            <table className="w-full min-w-[900px] table-fixed border-collapse text-sm" aria-label="Felder des Falls">
              <colgroup>
                <col className="w-[10rem]" />
                <col className="w-[10.5rem]" />
                <col className="w-[6rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[4.5rem]" />
                <col />
                <col className="w-[8.5rem]" />
                {mitSzenario && <col className="w-[6.5rem]" />}
                {mitPruefung && <col className="w-[10rem]" />}
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th scope="col" className="px-3 py-2 font-medium">Name</th>
                  <th scope="col" className="px-3 py-2 font-medium">Bezeichnung</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Wert</th>
                  <th scope="col" className="px-3 py-2 font-medium">Einheit</th>
                  <th scope="col" className="px-3 py-2 font-medium">Herkunft</th>
                  <th scope="col" className="px-3 py-2 font-medium">Quelle</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Spanne</th>
                  {mitSzenario && (
                    <th scope="col" className="px-3 py-2 text-right font-medium" data-testid="spalte-szenario">
                      Wert im Szenario
                    </th>
                  )}
                  {mitPruefung && <th scope="col" className="px-3 py-2 font-medium">Prüfung</th>}
                </tr>
              </thead>
              <tbody>
                {gruppen.map((g) => (
                  <Fragment key={g.gruppe}>
                    <tr className="border-b border-border bg-[var(--flaeche-zweit,transparent)]">
                      <th
                        scope="colgroup"
                        colSpan={spalten}
                        className="px-3 pt-3 pb-1.5 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {g.gruppe}
                      </th>
                    </tr>
                    {g.felder.map((f) => {
                      const unbegrenzt = f.name === obergrenze;
                      const imSzenario = szenarioWerte?.[f.name];
                      const weicht = mitSzenario && imSzenario !== undefined && (imSzenario ?? null) !== f.wert;
                      const meldung = (orte[`Feld ${f.bezeichnung}`] ?? [])[0];
                      return (
                        <tr key={f.name} className="border-b border-border align-top last:border-0" data-name={f.name}>
                          <td className="px-3 py-2 font-mono text-xs break-words">{f.name}</td>
                          <td className="px-3 py-2">{f.bezeichnung}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {wertText(f.wert, unbegrenzt)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{f.einheit || LEER}</td>
                          <td className="px-3 py-2">
                            <HerkunftBadge herkunft={f.herkunft} />
                          </td>
                          <td className="px-3 py-2 break-words hyphens-auto text-muted-foreground">{f.quelle || LEER}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {f.spanne ? `${kompakt(f.spanne[0])} bis ${kompakt(f.spanne[1])}` : LEER}
                          </td>
                          {mitSzenario && (
                            <td
                              className={cn(
                                "px-3 py-2 text-right font-mono text-xs",
                                weicht && "bg-[var(--marke-tint)] font-semibold"
                              )}
                              aria-label={weicht ? `${wertText(imSzenario, unbegrenzt)}, weicht ab` : undefined}
                            >
                              {wertText(imSzenario, unbegrenzt)}
                            </td>
                          )}
                          {mitPruefung && (
                            <td className="px-3 py-2">
                              {meldung && (
                                <span
                                  title={meldung.text}
                                  className={cn(
                                    "inline-flex rounded-full border px-2 py-0.5 text-[11px] leading-tight",
                                    meldung.stufe === "fehler"
                                      ? "border-[var(--status-ausschluss-rand)] bg-[var(--status-ausschluss-bg)] text-[var(--status-ausschluss-fg)]"
                                      : "border-[var(--status-warnung-rand)] bg-[var(--status-warnung-bg)] text-[var(--status-warnung-fg)]"
                                  )}
                                >
                                  {meldung.text}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
                {gruppen.length === 0 && (
                  <tr>
                    <td colSpan={spalten} className="px-3 py-6 text-center text-muted-foreground">
                      Kein Feld passt zu „{suche.trim()}“.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-[80ch] text-xs text-muted-foreground blocksatz">
            (L) Literatur, (A) Annahme, (N) Nutzerangabe. Felder mit Spanne gehen in den Tornado der
            Sensitivitätsanalyse.
          </p>
        </>
      )}
    </>
  );
}
