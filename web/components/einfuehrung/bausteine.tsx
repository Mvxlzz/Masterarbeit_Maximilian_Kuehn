"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Katex } from "@/components/katex";
import type {
  Schritt,
  TutorialBalken,
  TutorialFormel,
  TutorialRechenweg,
  TutorialStation,
  TutorialTabelle,
} from "@/lib/api";
import { CO2, co2, euro, rechenwert, zahl } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Bausteine der Einführung. Zeigen nur an, was GET /tutorial aus dem Rechenkern liefert: Formeln in LaTeX,
 * fertig formatierte Tabellen und Schritte des Rechenwegs. Hier wird nichts gerechnet.
 */

const PUNKTE_BEREICHE = new Set(["nutzwert", "beitrag", "normalisierung", "technik"]);

function ergebnisText(s: Schritt): string {
  if (PUNKTE_BEREICHE.has(s.bereich) || s.einheit === "Punkte") return zahl(s.ergebnis, 2);
  return rechenwert(s.ergebnis, s.einheit);
}

function Kopf({ nummer, abschnitt }: { nummer?: string; abschnitt?: string }) {
  if (!nummer && !abschnitt) return null;
  return (
    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
      {nummer ? <span className="font-mono font-semibold text-primary">{nummer}</span> : <span />}
      {abschnitt && <span>{abschnitt}</span>}
    </div>
  );
}

/** Text mit Formelteilen in $…$ (Wortlaut der Arbeit): Text normal, Formelteile mit KaTeX. */
export function TextMitFormeln({ text }: { text: string }) {
  const teile = text.split(/(\$[^$]+\$)/g).filter(Boolean);
  return (
    <>
      {teile.map((teil, i) =>
        teil.startsWith("$") && teil.endsWith("$") ? (
          <Katex key={i}>{teil.slice(1, -1)}</Katex>
        ) : (
          <span key={i}>{teil}</span>
        )
      )}
    </>
  );
}

export function FormelKarte({ formel }: { formel: TutorialFormel }) {
  return (
    <figure className="rounded-lg border border-border bg-[var(--flaeche-formel)] p-4">
      <Kopf nummer={formel.nummer} abschnitt={formel.abschnitt} />
      <figcaption className="mb-3 text-sm font-medium">{formel.titel}</figcaption>
      <div className="overflow-x-auto text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]" role="group" tabIndex={0} aria-label="Formel, waagerecht scrollbar">
        <Katex display>{formel.allgemein}</Katex>
      </div>
      {formel.eingesetzt && (
        <div className="mt-3 overflow-x-auto border-t border-border pt-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]" role="group" tabIndex={0} aria-label="Formel, waagerecht scrollbar">
          <Katex display>{formel.eingesetzt}</Katex>
        </div>
      )}
      {formel.ergebnis && (
        <p className="mt-2 text-sm">
          Ergebnis: <strong className="font-semibold">{formel.ergebnis}</strong>
        </p>
      )}
      {formel.zeichen.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-3 text-xs">
          {formel.zeichen.map((z) => (
            <div key={z.zeichen} className="contents">
              <dt className="text-right">
                <Katex>{z.zeichen}</Katex>
              </dt>
              <dd className="text-muted-foreground">
                <TextMitFormeln text={z.text} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {formel.erklaerung && (
        <p className="mt-2 max-w-[80ch] text-xs leading-relaxed text-muted-foreground blocksatz">{formel.erklaerung}</p>
      )}
    </figure>
  );
}

/** Zahlenspalten rechtsbündig in Mono, Textspalten linksbündig (nur Darstellung). */
const ZAHL = /^(—|[−-]?[\d.]+(,\d+)?(\s.*)?)$/;

export function TabelleKarte({ tabelle, klein = false }: { tabelle: TutorialTabelle; klein?: boolean }) {
  const markiert = new Set(tabelle.markiert);
  const zahlenspalte = tabelle.spalten.map(
    (_, i) => i > 0 && tabelle.zeilen.every((z) => ZAHL.test(z[i] ?? ""))
  );
  return (
    <div>
      <h2 className="mb-2 text-sm font-medium">{tabelle.titel}</h2>
      <div className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]" role="group" tabIndex={0} aria-label={`Tabelle ${tabelle.titel}, waagerecht scrollbar`}>
        <table className={cn("w-full border-collapse", klein ? "text-xs" : "text-sm")}>
          <thead>
            <tr className="border-b border-border bg-secondary text-left">
              {tabelle.spalten.map((s, i) => (
                <th
                  key={s + i}
                  scope="col"
                  className={cn("px-3 py-2 font-medium whitespace-nowrap", zahlenspalte[i] && "text-right")}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabelle.zeilen.map((zeile, r) => (
              <tr
                key={r}
                className={cn(
                  "border-b border-border last:border-0",
                  markiert.has(r) && "bg-[var(--marke-tint)] font-semibold"
                )}
              >
                {zeile.map((zelle, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-1.5 text-left font-normal">
                      {zelle}
                    </th>
                  ) : (
                    <td
                      key={i}
                      className={cn(
                        "px-3 py-1.5",
                        zahlenspalte[i] ? "text-right font-mono text-xs whitespace-nowrap" : "text-left"
                      )}
                    >
                      {zelle}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Eingaben der Station mit Herkunft (L) Literatur, (A) Annahme, (N) Nutzerangabe, Quelle und Spanne. */
export function EingabenKarte({ tabelle }: { tabelle: TutorialTabelle }) {
  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none hover:bg-accent">
        <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90">›</span>
        {tabelle.titel} · {tabelle.zeilen.length} Felder
      </summary>
      <div className="overflow-x-auto border-t border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]" role="group" tabIndex={0} aria-label="Eingaben, waagerecht scrollbar">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary text-left">
              {tabelle.spalten.map((s) => (
                <th key={s} scope="col" className="px-3 py-2 font-medium">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabelle.zeilen.map(([bezeichnung, wert, herkunft, quelle, spanne]) => (
              <tr key={bezeichnung} className="border-b border-border last:border-0">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  {bezeichnung}
                </th>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">{wert}</td>
                <td className="px-3 py-1.5">
                  <span
                    className="inline-grid size-5 place-items-center rounded-full border font-mono text-[10px] font-semibold"
                    style={{
                      color: `var(--herkunft-${herkunft.toLowerCase()}-fg)`,
                      background: `var(--herkunft-${herkunft.toLowerCase()}-bg)`,
                      borderColor: `var(--herkunft-${herkunft.toLowerCase()}-rand)`,
                    }}
                    title={{ L: "Literatur", A: "Annahme", N: "Nutzerangabe" }[herkunft] ?? herkunft}
                  >
                    {herkunft}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{quelle}</td>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">{spanne}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function SchrittBlock({ schritt }: { schritt: Schritt }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--flaeche-formel)] p-4">
      <Kopf nummer={schritt.nummer} abschnitt={schritt.abschnitt} />
      {schritt.formel_latex && (
        <div className="mb-2.5 overflow-x-auto text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]" role="group" tabIndex={0} aria-label="Formel, waagerecht scrollbar">
          <Katex>{(schritt.links_latex ? `${schritt.links_latex} = ` : "") + schritt.formel_latex}</Katex>
        </div>
      )}
      <div className="overflow-x-auto border-t border-border pt-2.5 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]" role="group" tabIndex={0} aria-label="Formel, waagerecht scrollbar">
        <Katex>{schritt.eingesetzt_latex}</Katex>
        <span> = </span>
        <strong className="font-mono">{ergebnisText(schritt)}</strong>
      </div>
    </div>
  );
}

export function RechenwegKarte({ rechenweg }: { rechenweg: TutorialRechenweg }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-medium">Rechenweg: {rechenweg.titel}</h2>
      <div className="space-y-2">
        {rechenweg.schritte.map((s, i) => (
          <SchrittBlock key={i} schritt={s} />
        ))}
      </div>
    </div>
  );
}

/** Die vier Verarbeitungsstufen (Abschnitt 4.1, Abbildung 3) mit Rückkopplung von Stufe 4 auf Stufe 3. */
export function Stufenbild({ stufen }: { stufen: { titel: string; text: string }[] }) {
  return (
    <figure aria-label="Die vier Verarbeitungsstufen des Systems">
      <ol className="grid gap-3 md:grid-cols-4">
        {stufen.map((s, i) => (
          <li
            key={s.titel}
            className={cn(
              "relative rounded-lg border bg-card p-4",
              i === stufen.length - 1 ? "border-[var(--primaer)]" : "border-border"
            )}
          >
            <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Stufe {i + 1}
            </span>
            <span className="block text-sm font-semibold">{s.titel.replace(/^\d+\s*/, "")}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{s.text}</span>
            {i < stufen.length - 1 && (
              <span
                aria-hidden
                className="absolute top-1/2 -right-3 hidden -translate-y-1/2 text-muted-foreground md:block"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="inline-block h-0 w-6 border-t-2 border-dashed border-[var(--primaer)]" />
        Rückkopplung: Stufe 4 variiert Eingaben und Gewichte und durchläuft Stufe 3 erneut.
      </figcaption>
    </figure>
  );
}

/**
 * Senkrechte Stationsliste mit Status: ✓ erledigt, gefüllt aktuell, hohl offen (Vorbild Turo, Klaviyo).
 * Erledigt sind alle Stationen vor der aktuellen und jede bereits besuchte, auch wenn man direkt springt.
 */
export function Stationsliste({
  stationen,
  aktuell,
  besucht,
}: {
  stationen: Pick<TutorialStation, "nr" | "titel">[];
  aktuell: number;
  besucht: Set<number>;
}) {
  const anzahl = stationen.length;
  const istErledigt = (nr: number) => nr < aktuell || besucht.has(nr);
  // Die aktuelle Station zählt als angesehen
  const erledigt = stationen.filter((s) => s.nr === aktuell || istErledigt(s.nr)).length;
  return (
    <nav aria-label="Stationen der Einführung">
      <h2 className="mb-1 px-2 text-base font-semibold">Einführung</h2>
      <p className="mb-3 px-2 text-xs text-muted-foreground">
        {erledigt} von {anzahl} Stationen angesehen
      </p>
      <div
        className="mx-2 mb-4 h-1 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label="Fortschritt der Einführung"
        aria-valuemin={0}
        aria-valuemax={anzahl}
        aria-valuenow={erledigt}
      >
        <div className="h-full rounded-full bg-[var(--primaer)]" style={{ width: `${(erledigt / anzahl) * 100}%` }} />
      </div>
      <ol className="relative">
        {stationen.map((s, i) => {
          const istAktuell = s.nr === aktuell;
          const istBesucht = istErledigt(s.nr) && !istAktuell;
          return (
            <li key={s.nr} className="relative">
              {i < anzahl - 1 && (
                <span aria-hidden className="absolute top-7 bottom-[-6px] left-[19px] w-px bg-border" />
              )}
              <Link
                href={`/einfuehrung/${s.nr}`}
                aria-current={istAktuell ? "step" : undefined}
                className={cn(
                  "relative flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  istAktuell && "bg-accent font-semibold text-foreground"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border font-mono text-[10px]",
                    istAktuell && "border-[var(--primaer)] bg-[var(--primaer)] text-[var(--flaeche)]",
                    istBesucht && "border-[var(--primaer)] text-[var(--primaer)]",
                    !istAktuell && !istBesucht && "border-border bg-card"
                  )}
                >
                  {istBesucht ? <Check className="size-3" strokeWidth={2.5} /> : s.nr}
                </span>
                <span className="leading-snug">
                  {s.titel}
                  <span className="sr-only">{istBesucht ? " (angesehen)" : ""}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Balken einer Station (Kostentreiber, Treibhauspotenzial), Werte unverändert aus GET /tutorial. */
export function BalkenKarte({ balken, farbe }: { balken: TutorialBalken; farbe: string }) {
  const format = (v: number) => (balken.einheit === "€" ? euro(v) : balken.einheit === CO2 ? co2(v) : zahl(v));
  const hoehe = Math.max(140, 34 * balken.werte.length + 40);
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-medium">{balken.titel}</figcaption>
      <div
        role="img"
        aria-label={`${balken.titel}: ${balken.werte.map((w) => `${w.name} ${format(w.wert)}`).join("; ")}`}
        className="rounded-lg border border-border bg-card p-3"
      >
        <ResponsiveContainer width="100%" height={hoehe}>
          <BarChart layout="vertical" data={balken.werte} margin={{ top: 4, right: 96, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="var(--linie)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={230}
              stroke="var(--text-gedaempft)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Bar dataKey="wert" fill={farbe} barSize={14} isAnimationActive={false} radius={[0, 3, 3, 0]}>
              <LabelList
                dataKey="wert"
                position="right"
                formatter={(v) => format(Number(v))}
                fill="var(--text)"
                fontSize={11}
                fontFamily="var(--font-mono)"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
