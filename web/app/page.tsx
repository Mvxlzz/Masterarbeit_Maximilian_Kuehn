import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { LandingVideo } from "@/components/landing/landing-video";
import { GrafikDimensionen, GrafikKipppunkt, GrafikRechenweg } from "@/components/landing/mini-grafiken";
import { cn } from "@/lib/utils";

/**
 * Landing Page. Bewusste Ausnahme: eine orchestrierte Einblendung beim Laden und ein kurzes Video, sonst ruhig.
 * Keine Zahlen und keine Anzeigenamen der Alternativen im Code, die echten Werte zeigt nur das Video.
 */
export const metadata: Metadata = {
  title: "Wiederaufbereitungsalternativen",
  description:
    "Technische, ökonomische und ökologische Bewertung von Wiederaufbereitungsalternativen mit Rechenweg und Kipppunkten.",
};

const LOESUNGEN = [
  {
    titel: "Drei Dimensionen, eine Rangfolge",
    text: "Technische Eignung, Kosten und Treibhauspotenzial werden normalisiert und gewichtet. Statt drei Tabellen nebeneinander steht eine Rangfolge nach Gesamtnutzwert, mit dem Beitrag jeder Dimension.",
    grafik: <GrafikDimensionen />,
  },
  {
    titel: "Wissen, wann die Empfehlung kippt",
    text: "Neuteilpreis, Lohnkosten oder Lieferzeiten ändern sich. Tornado, Kipppunkte und Szenarien zeigen, welche Annahme die Entscheidung trägt und ab welchem Wert eine andere Alternative vorne liegt.",
    grafik: <GrafikKipppunkt />,
  },
  {
    titel: "Jede Zahl nachprüfbar",
    text: "Zu jedem Wert gehören Formel, eingesetzte Werte und die Herkunft der Eingabe: Literatur, Annahme oder Ihre Angabe. Eigene Bauteile legen Sie als Fall mit eigenen Feldern und Formeln an.",
    grafik: <GrafikRechenweg />,
  },
];

const SCHRITTE = [
  {
    titel: "Bauteil und Schaden beschreiben",
    text: "Werkstoff, Schadensart und Schadensgrad des Cores.",
    abschnitt: "4.2",
  },
  {
    titel: "Eignung im Gate prüfen",
    text: "Ungeeignete Alternativen scheiden vor der Bewertung aus.",
    abschnitt: "4.1.4",
  },
  {
    titel: "Dimensionen bewerten und gewichten",
    text: "Min-Max-Normalisierung und gewichtete Summe.",
    abschnitt: "4.3 und 4.4",
  },
  {
    titel: "Stabilität prüfen",
    text: "Einparameter-Variation, Kipppunkte und Szenarien.",
    abschnitt: "4.5",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
            <span className="hidden text-sm font-semibold sm:inline">Wiederaufbereitungsalternativen</span>
          </Link>
          <nav aria-label="Einstieg" className="flex items-center gap-1.5">
            <Link
              href="/einfuehrung/1"
              className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}
            >
              Einführung
            </Link>
            <Link href="/projekte" className={buttonVariants()}>
              Zur Anwendung
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="leer-punkte border-b border-border">
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] lg:gap-14 lg:py-20">
            <div>
              <h1 className="landing-auf max-w-[20ch] text-[2.375rem] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[3rem]">
                Für jeden Core eine Entscheidung, die Sie{"\u00a0"}
                <span className="landing-unterstrich sm:whitespace-nowrap">begründen können.</span>
              </h1>
              <p
                className="landing-auf mt-6 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted-foreground"
                style={{ ["--verzug" as string]: "120ms" }}
              >
                Sie sehen auf einen Blick, welche Wiederaufbereitungsalternative unter Ihren Annahmen vorne
                liegt:{" "}
                <strong className="font-semibold text-foreground">
                  technisch, ökonomisch und ökologisch
                </strong>{" "}
                in einem Gesamtnutzwert, mit{" "}
                <strong className="font-semibold text-foreground">Rechenweg zu jeder Zahl</strong> und dem
                Wert, <strong className="font-semibold text-foreground">ab dem die Empfehlung kippt</strong>.
              </p>
              <div
                className="landing-auf mt-8 flex flex-wrap items-center gap-2.5"
                style={{ ["--verzug" as string]: "220ms" }}
              >
                <Link href="/projekte" className={buttonVariants({ size: "lg", className: "px-4" })}>
                  Zur Anwendung
                </Link>
                <Link
                  href="/einfuehrung/1"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "px-4",
                  })}
                >
                  Einführung starten
                </Link>
              </div>
            </div>

            <div className="landing-auf" style={{ ["--verzug" as string]: "360ms" }}>
              <LandingVideo>
                <div className="mt-4 flex items-center gap-4" aria-hidden="true">
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--flaeche-hover)]">
                    <span
                      className="landing-balken h-full w-1/3 bg-[var(--dim-tech)]"
                      style={{ ["--verzug" as string]: "1000ms" }}
                    />
                    <span
                      className="landing-balken h-full w-1/3 bg-[var(--dim-oekon)]"
                      style={{ ["--verzug" as string]: "1250ms" }}
                    />
                    <span
                      className="landing-balken h-full w-1/3 bg-[var(--dim-oekol)]"
                      style={{ ["--verzug" as string]: "1500ms" }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  technisch, ökonomisch und ökologisch in einem Gesamtnutzwert
                </p>
              </LandingVideo>
            </div>
          </div>
        </section>

        <section aria-labelledby="loesungen" className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 id="loesungen" className="max-w-[40ch] text-2xl font-semibold tracking-[-0.015em]">
              Was die Anwendung Ihnen abnimmt
            </h2>
            <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0">
              {LOESUNGEN.map((l, i) => (
                <article
                  key={l.titel}
                  className={cn(
                    "md:px-8",
                    i === 0 ? "md:pl-0" : "md:border-l md:border-border",
                    i === 2 && "md:pr-0",
                  )}
                >
                  {l.grafik}
                  <h3 className="mt-5 text-base font-semibold">{l.titel}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{l.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="ablauf" className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 id="ablauf" className="text-2xl font-semibold tracking-[-0.015em]">
              So entsteht eine Bewertung
            </h2>
            <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
              Die Methode folgt Kapitel 4 der Arbeit und bleibt fest. Anpassen lassen sich Felder, Formeln,
              Alternativen, Gewichte und Szenarien.
            </p>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
              {SCHRITTE.map((s, i) => (
                <li key={s.titel} className="relative lg:pr-8">
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--linie-stark)] bg-card font-mono text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    {i < SCHRITTE.length - 1 && (
                      <span
                        className="hidden h-px flex-1 bg-[var(--linie-stark)] lg:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <h3 className="mt-4 text-[0.9375rem] font-semibold">{s.titel}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Abschnitt {s.abschnitt}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Masterarbeit von Maximilian Kühn, Hochschule München, 2026: Entwicklung eines Systems zur
            taktischen Bewertung von Wiederaufbereitungsalternativen im Remanufacturing.
          </p>
          <nav aria-label="Weitere Seiten" className="flex shrink-0 gap-4">
            <Link href="/architektur" className="underline-offset-4 hover:text-foreground hover:underline">
              Architektur
            </Link>
            <Link
              href="/blaetter/methode"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Formelblätter
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
