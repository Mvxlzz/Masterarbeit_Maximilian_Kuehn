"use client";

import { AlertTriangle, Info } from "lucide-react";

import type { Meldung } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Zusammenfassung der Prüfmeldungen oben auf der Fall-Seite. */
export function Pruefleiste({
  meldungen,
  aktuell,
}: {
  meldungen: Meldung[];
  aktuell: boolean;
}) {
  if (meldungen.length === 0) return null;
  const fehler = meldungen.filter((m) => m.stufe === "fehler");
  const warnungen = meldungen.filter((m) => m.stufe === "warnung");
  const n = meldungen.length;

  return (
    <div
      role="status"
      className={cn(
        "mb-4 rounded-lg border px-4 py-3 text-sm",
        fehler.length > 0
          ? "border-destructive/40 bg-destructive/5 text-foreground"
          : "border-amber-500/40 bg-amber-500/5 text-foreground"
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 font-medium">
        {fehler.length > 0 ? (
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
        ) : (
          <Info className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
        )}
        <span>
          {n === 1 ? "1 Prüfmeldung" : `${n} Prüfmeldungen`}
          {fehler.length > 0 && ` · ${fehler.length} Fehler`}
          {warnungen.length > 0 && ` · ${warnungen.length} Warnungen`}
        </span>
      </div>
      {!aktuell && (
        <p className="mb-2 text-muted-foreground">
          Ergebnis und Sensitivität zeigen den letzten gültigen Stand, bis Sie die Fehler
          korrigieren.
        </p>
      )}
      <ul className="space-y-1">
        {meldungen.map((m, i) => (
          <li key={`${m.ort}-${i}`}>
            <a
              href={`#ort-${encodeURIComponent(m.ort)}`}
              className="underline-offset-2 hover:underline"
              onClick={(ev) => {
                const ziel = document.querySelector(
                  `[data-ort="${CSS.escape(m.ort)}"]`
                );
                if (ziel) {
                  ev.preventDefault();
                  ziel.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
            >
              <span className="font-medium">{m.ort}:</span> {m.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
