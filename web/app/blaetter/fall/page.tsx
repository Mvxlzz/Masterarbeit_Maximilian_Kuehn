"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sigma } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { Katex } from "@/components/katex";
import { Leerzustand } from "@/components/leerzustand";
import { useProjekte } from "@/components/projekte-provider";
import { SeitenKopf } from "@/components/szenarien/teile";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiFehler, fallFormeln, type FallFormel, type FallFormelnAntwort } from "@/lib/api";
import { alternativen as altsAus, DIMENSION_TEXT } from "@/lib/fall";

const TITEL = "Formeln des Falls";
const ABSCHNITT = "Abschnitte 4.3.2 und 4.3.3";

function FormelBlatt({ f, namen }: { f: FallFormel; namen: Record<string, string> }) {
  return (
    <figure
      className="rounded-lg border border-border bg-[var(--flaeche-formel)] p-4"
      data-testid="fall-formel"
      data-art={f.art}
    >
      <figcaption className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">{f.bezeichnung}</span>
        {f.name && <span className="font-mono text-xs text-muted-foreground">{f.name}</span>}
        {f.art === "hilfsgroesse" && f.einheit && (
          <span className="text-xs text-muted-foreground">[{f.einheit}]</span>
        )}
      </figcaption>
      {f.fehler ? (
        <div className="flex flex-wrap items-start gap-2 text-sm">
          <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-[var(--status-ausschluss-rand)] bg-[var(--status-ausschluss-bg)] px-2 font-mono text-[11px] font-medium uppercase text-[var(--status-ausschluss-fg)]">
            nicht darstellbar
          </span>
          <span className="text-muted-foreground">
            <code className="font-mono text-xs">{f.formel}</code>: {f.fehler}
          </span>
        </div>
      ) : (
        <div
          className="overflow-x-auto text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]"
          role="group"
          tabIndex={0}
          aria-label={`Formel ${f.bezeichnung}, waagerecht scrollbar`}
        >
          <Katex display>{`${f.links_latex} = ${f.latex}`}</Katex>
        </div>
      )}
      {f.art === "position" && f.alternativen.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>gilt für:</span>
          {f.alternativen.map((a) => (
            <span
              key={a}
              className="inline-flex h-5 items-center rounded-full border border-border bg-secondary px-2 text-[11px] text-foreground"
            >
              {namen[a] ?? a}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

/** Hilfsgrößen und Positionen des Falls als Formel (POST /latex/fall), nur lesend. */
export default function FallFormelnPage() {
  const { offenesProjekt } = useProjekte();
  const { datei } = useFall();
  const [antwort, setAntwort] = useState<FallFormelnAntwort | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!datei) return;
    let ab = false;
    fallFormeln(datei)
      .then((a) => {
        if (ab) return;
        setAntwort(a);
        setFehler(null);
      })
      .catch((e) => {
        if (!ab) setFehler(e instanceof ApiFehler ? e.message : "Die Formeln ließen sich nicht laden.");
      });
    return () => {
      ab = true;
    };
  }, [datei]);

  const namen = useMemo(
    () => Object.fromEntries((datei ? altsAus(datei) : []).map((a) => [a.schluessel, a.name])),
    [datei]
  );

  const gruppen = useMemo(() => {
    const aus: { dimension: string; einheit: string; formeln: FallFormel[] }[] = [];
    for (const p of antwort?.positionen ?? []) {
      let g = aus.find((x) => x.dimension === p.dimension);
      if (!g) {
        g = { dimension: p.dimension, einheit: p.einheit, formeln: [] };
        aus.push(g);
      }
      g.formeln.push(p);
    }
    return aus;
  }, [antwort]);

  if (!offenesProjekt) {
    return (
      <>
        <SeitenKopf
          titel={TITEL}
          abschnitt={ABSCHNITT}
          text="Hilfsgrößen und Positionen des geöffneten Projekts als Formel."
        />
        <Leerzustand
          icon={<Sigma className="size-[18px]" strokeWidth={1.5} />}
          titel="Kein Projekt geöffnet"
          text="Öffnen Sie ein Projekt unter Projekte, dann erscheinen hier seine Hilfsgrößen und Positionen als Formel."
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
            Formeln des Falls „{offenesProjekt.name}“. Geändert werden sie unter{" "}
            <Link href="/fall/formeln" className="text-foreground underline underline-offset-2">
              Fall bearbeiten, Reiter Formeln
            </Link>
            . Die Werte je Alternative zeigt der Rechenweg auf der Seite{" "}
            <Link href="/ergebnis" className="text-foreground underline underline-offset-2">
              Ergebnis
            </Link>
            .
          </>
        }
      />
      {fehler && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {fehler}
        </div>
      )}
      {!antwort && !fehler && (
        <div className="grid max-w-[1040px] gap-3" aria-busy="true" aria-label="Formeln werden geladen">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
      {antwort && (
        <div className="max-w-[1040px] space-y-8">
          <section aria-labelledby="hilfsgroessen-titel">
            <h2 id="hilfsgroessen-titel" className="mb-3 text-lg font-medium">
              Hilfsgrößen
            </h2>
            {antwort.hilfsgroessen.length === 0 ? (
              <p className="text-sm text-muted-foreground">Der Fall hat keine Hilfsgrößen.</p>
            ) : (
              <div className="grid gap-3">
                {antwort.hilfsgroessen.map((f) => (
                  <FormelBlatt key={f.name} f={f} namen={namen} />
                ))}
              </div>
            )}
          </section>
          {gruppen.map((g) => (
            <section key={g.dimension} aria-labelledby={`positionen-${g.dimension}`}>
              <h2 id={`positionen-${g.dimension}`} className="mb-3 text-lg font-medium">
                Positionen der{" "}
                {DIMENSION_TEXT[g.dimension as keyof typeof DIMENSION_TEXT] ?? g.dimension}en Dimension [
                {g.einheit}]
              </h2>
              <div className="grid gap-3">
                {g.formeln.map((f, i) => (
                  <FormelBlatt key={`${f.bezeichnung}-${i}`} f={f} namen={namen} />
                ))}
              </div>
            </section>
          ))}
          {gruppen.length === 0 && <p className="text-sm text-muted-foreground">Der Fall hat keine Positionen.</p>}
          <section aria-label="Zeichenerklärung" className="rounded-lg border border-border bg-card p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-right">
                <Katex>{"K_{a,p}"}</Katex>
              </dt>
              <dd className="text-muted-foreground">
                Kosten der Position <Katex>p</Katex> bei Alternative <Katex>a</Katex>
              </dd>
              <dt className="text-right">
                <Katex>{"E_{a,p}"}</Katex>
              </dt>
              <dd className="text-muted-foreground">
                Treibhauspotenzial der Position <Katex>p</Katex> bei Alternative <Katex>a</Katex>
              </dd>
              <dt className="text-right">
                <Katex>{"K_{\\text{intern}}"}</Katex>
              </dt>
              <dd className="text-muted-foreground">
                steht für <code className="font-mono">kosten(&quot;intern&quot;)</code>, die Summe der
                Kostenpositionen einer Alternative
              </dd>
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
