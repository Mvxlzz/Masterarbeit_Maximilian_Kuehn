"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { holeKatalog, type KatalogAntwort, type Meldung } from "@/lib/api";
import { eingabe, lesen } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Seitenkopf der Szenarien-Seiten: Titel, ein Satz, Abschnitt der Arbeit (DESIGN.md Abschnitt 0). */
export function SeitenKopf({
  titel,
  text,
  abschnitt,
  aktionen,
}: {
  titel: string;
  text: ReactNode;
  abschnitt: string;
  aktionen?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="mb-1.5 text-2xl font-medium tracking-tight">{titel}</h1>
        <p className="max-w-[72ch] text-sm text-muted-foreground blocksatz">{text}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {aktionen}
        <span
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground"
          title="Hintergrund und Formeln in der Masterarbeit"
        >
          <BookOpen className="size-3.5" aria-hidden />
          {abschnitt}
        </span>
      </div>
    </header>
  );
}

/** Prüfmeldungen an einer Zeile: erster Text, alle im Titel; ✓ ohne Meldung. */
export function ZeilenMeldung({ meldungen }: { meldungen: Meldung[] }) {
  if (meldungen.length === 0) {
    return (
      <span className="text-muted-foreground" aria-label="ohne Befund">
        ✓
      </span>
    );
  }
  const fehler = meldungen.some((m) => m.stufe === "fehler");
  return (
    <span
      role={fehler ? "alert" : undefined}
      className={fehler ? "text-[var(--status-ausschluss-fg)]" : "text-[var(--status-warnung-fg)]"}
      title={meldungen.map((m) => m.text).join(" ")}
    >
      {meldungen[0].text}
    </span>
  );
}

let katalogCache: Promise<KatalogAntwort> | null = null;

/** Katalog (Faktortypen, Einstellungen, Bausteine) einmal je Sitzung laden. */
export function useKatalog(): KatalogAntwort | null {
  const [k, setK] = useState<KatalogAntwort | null>(null);
  useEffect(() => {
    katalogCache ??= holeKatalog();
    let ab = false;
    katalogCache
      .then((x) => {
        if (!ab) setK(x);
      })
      .catch(() => {
        katalogCache = null;
      });
    return () => {
      ab = true;
    };
  }, []);
  return k;
}

/**
 * Zahlenfeld mit deutscher Eingabe (lib/format.lesen). Übernimmt den Wert beim Verlassen oder mit Enter;
 * ein Tippfehler wird an der Zeile gemeldet und nicht übernommen.
 */
export function ZahlFeld({
  wert,
  onUebernehmen,
  label,
  readOnly,
  className,
}: {
  wert: number;
  onUebernehmen: (x: number) => void;
  label: string;
  readOnly?: boolean;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const anzeige = text ?? eingabe(wert);
  function uebernehmen() {
    if (text === null) return;
    try {
      const x = lesen(text);
      setFehler(null);
      setText(null);
      if (x !== wert) onUebernehmen(x);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Keine Zahl.");
    }
  }
  return (
    <div className="flex flex-col gap-0.5">
      <Input
        value={anzeige}
        readOnly={readOnly}
        aria-label={label}
        aria-invalid={!!fehler}
        inputMode="decimal"
        className={cn("h-8 text-right font-mono text-[13px]", className)}
        onChange={(e) => setText(e.target.value)}
        onBlur={uebernehmen}
        onKeyDown={(e) => {
          if (e.key === "Enter") uebernehmen();
        }}
      />
      {fehler && (
        <span role="alert" className="text-xs text-[var(--status-ausschluss-fg)]">
          {fehler}
        </span>
      )}
    </div>
  );
}

/** Dialog für einen Namen (neuer Einflussfaktor, neues Szenario), optional mit weiteren Feldern. */
export function NamenDialog({
  offen,
  onOffen,
  titel,
  beschreibung,
  start = "",
  platzhalter,
  knopf,
  onAbsenden,
  children,
}: {
  offen: boolean;
  onOffen: (o: boolean) => void;
  titel: string;
  beschreibung: string;
  start?: string;
  platzhalter?: string;
  knopf: string;
  onAbsenden: (name: string) => void;
  children?: ReactNode;
}) {
  const [name, setName] = useState(start);
  const [fehler, setFehler] = useState("");
  useEffect(() => {
    if (offen) {
      /* eslint-disable react-hooks/set-state-in-effect -- Formular beim Öffnen zurücksetzen */
      setName(start);
      setFehler("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [offen, start]);
  return (
    <Dialog open={offen} onOpenChange={onOffen}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{titel}</DialogTitle>
          <DialogDescription>{beschreibung}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setFehler("Bitte einen Namen eingeben.");
              return;
            }
            onAbsenden(name.trim());
            onOffen(false);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="namen-dialog-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="namen-dialog-name"
              value={name}
              maxLength={80}
              placeholder={platzhalter}
              aria-invalid={!!fehler}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setFehler("");
              }}
            />
            {fehler && (
              <span role="alert" className="text-xs text-[var(--status-ausschluss-fg)]">
                {fehler}
              </span>
            )}
          </div>
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOffen(false)}>
              Abbrechen
            </Button>
            <Button type="submit">{knopf}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
