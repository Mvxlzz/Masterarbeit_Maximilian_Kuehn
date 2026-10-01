"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { alternativen, gate as gateAus, setzeGate } from "@/lib/fall";
import { cn } from "@/lib/utils";

const GATE_FELDER = [
  {
    feld: "bauteil_aufbereitbar" as const,
    beschriftung: "Bauteil in der vorgelagerten Eignungsprüfung wiederaufbereitbar",
    hilfe:
      "Fällt die Eignungsprüfung negativ aus, scheiden alle Alternativen der Art Wiederaufbereitung aus.",
  },
  {
    feld: "ersatzbedarf" as const,
    beschriftung: "Ersatzbedarf besteht",
    hilfe:
      "Mit Ersatzbedarf scheidet Ausscheiden aus, ohne Ersatzbedarf der Neuteilersatz.",
  },
  {
    feld: "neuteil_verfuegbar" as const,
    beschriftung: "Neuteil verfügbar",
    hilfe: "Ist kein Neuteil verfügbar, scheidet der Neuteilersatz aus.",
  },
];

export default function FallGatePage() {
  const { datei, ergebnis, aktuell, schreibgeschuetzt, aendereDatei } = useFall();

  const g = useMemo(() => (datei ? gateAus(datei) : null), [datei]);
  const alts = useMemo(() => (datei ? alternativen(datei) : []), [datei]);

  if (!datei || !g) return null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Gate</h1>
        <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
          Abschnitte 4.1.4 und 4.2.4
        </p>
      </header>

      <section className="space-y-4" aria-label="Gate-Einstellungen">
        {GATE_FELDER.map(({ feld, beschriftung, hilfe }) => (
          <div key={feld} className="flex items-start gap-3">
            <Checkbox
              id={`gate-${feld}`}
              checked={g[feld]}
              disabled={schreibgeschuetzt}
              aria-label={beschriftung}
              onCheckedChange={(c) => {
                aendereDatei((d) => setzeGate(d, { [feld]: Boolean(c) }));
              }}
            />
            <div className="grid gap-0.5">
              <Label htmlFor={`gate-${feld}`} className="font-normal leading-snug">
                {beschriftung}
              </Label>
              <p className="text-xs text-muted-foreground">{hilfe}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">
          Wirkung auf die Alternativen
        </h2>
        {!aktuell || !ergebnis ? (
          <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
            Die Wirkung erscheint, sobald das Modell keine Fehler mehr enthält.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="gate-wirkung">
            {alts.map((alt) => {
              const grund = ergebnis.ausgeschlossen[alt.schluessel];
              const ausgeschlossen = Boolean(grund);
              return (
                <li
                  key={alt.schluessel}
                  data-alternative={alt.schluessel}
                  data-status={ausgeschlossen ? "ausgeschlossen" : "zulaessig"}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                    ausgeschlossen
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  {ausgeschlossen ? (
                    <XCircle
                      className="mt-0.5 size-4 shrink-0 text-destructive"
                      aria-hidden
                    />
                  ) : (
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    />
                  )}
                  <div>
                    <p
                      className={cn(
                        "font-medium",
                        ausgeschlossen && "line-through text-muted-foreground"
                      )}
                    >
                      {alt.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ausgeschlossen ? grund : "zulässig"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
