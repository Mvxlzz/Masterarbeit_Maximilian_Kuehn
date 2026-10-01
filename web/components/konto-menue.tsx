"use client";

import { useState } from "react";
import { ChevronDown, Cloud, CloudOff, CloudUpload, LogIn, LogOut, Trash2 } from "lucide-react";

import { useKonto } from "@/components/konto-provider";
import { useProjekte, type Speicherstand } from "@/components/projekte-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uhrzeit } from "@/lib/format";
import { KontoFehler } from "@/lib/konto";
import { cn } from "@/lib/utils";

/** Text des Speicherstands eines Konto-Projekts (Konto-Menü und Wolke im Pfad). */
export function speicherText(s: Speicherstand | undefined): string {
  if (!s) return "Im Konto gespeichert";
  switch (s.stand) {
    case "gespeichert":
      return `Im Konto gespeichert · ${uhrzeit(s.zeit)}`;
    case "ausstehend":
    case "speichert":
      return "Wird gespeichert …";
    case "fehler":
      return "Nicht gespeichert";
  }
}

function meldung(e: unknown, standard: string): string {
  return e instanceof KontoFehler ? e.message : standard;
}

/**
 * Wolke hinter dem Projektnamen im Pfad: Speicherstand eines Konto-Projekts, ohne das Menü zu öffnen.
 * Browser-Projekte zeigen nichts.
 */
export function Speicherwolke() {
  const { offenesProjekt, speicherstand } = useProjekte();
  if (offenesProjekt?.ort !== "konto") return null;
  const s = speicherstand[offenesProjekt.id];
  const text = speicherText(s);
  const Symbol = s?.stand === "fehler" ? CloudOff : s?.stand === "ausstehend" || s?.stand === "speichert" ? CloudUpload : Cloud;
  return (
    <span
      data-testid="speicherstatus"
      data-stand={s?.stand ?? "gespeichert"}
      role="status"
      title={s?.stand === "fehler" ? `${text}: ${s.text}` : text}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground",
        s?.stand === "fehler" && "text-[var(--status-ausschluss-fg)]"
      )}
    >
      <Symbol className="size-3.5" aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Konto rechts in der Kopfleiste Ohne Konfiguration nichts (Gastmodus). */
export function KontoMenue() {
  const { konfiguriert, bereit, email } = useKonto();
  if (!konfiguriert) return null;
  if (!bereit) return <span aria-hidden className="h-7 w-[92px] shrink-0" />;
  return email ? <Angemeldet email={email} /> : <Anmelden />;
}

// ------------------------------------------------------------------ Gast: Anmelden oder Konto anlegen

function Anmelden() {
  const { anmelden, registrieren } = useKonto();
  const [offen, setOffen] = useState(false);
  const [modus, setModus] = useState<"anmelden" | "registrieren">("anmelden");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [sendet, setSendet] = useState(false);

  function oeffnen(o: boolean) {
    setOffen(o);
    if (o) {
      setFehler("");
      setPasswort("");
    }
  }

  async function absenden() {
    setFehler("");
    setSendet(true);
    try {
      if (modus === "anmelden") await anmelden(email, passwort);
      else await registrieren(email, passwort);
      setPasswort("");
      setOffen(false);
    } catch (e) {
      setFehler(meldung(e, "Die Anmeldung ist fehlgeschlagen."));
    } finally {
      setSendet(false);
    }
  }

  const titel = modus === "anmelden" ? "Anmelden" : "Konto anlegen";
  return (
    <>
      <button
        type="button"
        data-testid="konto-knopf"
        onClick={() => oeffnen(true)}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-foreground hover:bg-accent"
      >
        <LogIn className="size-3.5" aria-hidden />
        Anmelden
      </button>
      <Dialog open={offen} onOpenChange={oeffnen}>
        <DialogContent className="sm:max-w-[420px]" data-testid="anmelde-dialog">
          <DialogHeader>
            <DialogTitle>{titel}</DialogTitle>
          </DialogHeader>
          <Tabs
            value={modus}
            onValueChange={(v) => {
              setModus(v as "anmelden" | "registrieren");
              setFehler("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="anmelden" className="flex-1">
                Anmelden
              </TabsTrigger>
              <TabsTrigger value="registrieren" className="flex-1">
                Konto anlegen
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void absenden();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="konto-email" className="text-sm font-medium">
                E-Mail-Adresse
              </label>
              <Input
                id="konto-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="konto-passwort" className="text-sm font-medium">
                Passwort
              </label>
              <Input
                id="konto-passwort"
                type="password"
                autoComplete={modus === "anmelden" ? "current-password" : "new-password"}
                aria-describedby="konto-passwort-hinweis"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                aria-invalid={!!fehler}
              />
              <span id="konto-passwort-hinweis" className="text-xs text-muted-foreground">
                Mindestens sechs Zeichen.
              </span>
            </div>
            {fehler && (
              <p role="alert" className="text-sm text-[var(--status-ausschluss-fg)]">
                {fehler}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => oeffnen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={sendet}>
                {sendet ? `${titel} …` : titel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------------------ Angemeldet: Menü, Abmelden, Konto löschen

function Angemeldet({ email }: { email: string }) {
  const { abmelden } = useKonto();
  const { offenesProjekt, speicherstand, speichereJetzt, speichereAlles } = useProjekte();
  const [loeschenOffen, setLoeschenOffen] = useState(false);
  const kontoProjekt = offenesProjekt?.ort === "konto" ? offenesProjekt : undefined;
  const stand = kontoProjekt ? speicherstand[kontoProjekt.id] : undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          data-testid="konto-knopf"
          title="Konto"
          aria-label={`Konto ${email}`}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-secondary pr-1.5 pl-1 text-xs font-medium hover:bg-accent data-popup-open:bg-accent"
        >
          <span
            aria-hidden
            className="grid size-5 place-items-center rounded-full bg-primary/15 font-mono text-[11px] uppercase text-primary"
          >
            {email.slice(0, 1)}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72" data-testid="konto-menue">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span>Angemeldet als</span>
              <span className="truncate font-mono text-xs text-foreground" data-testid="konto-email">
                {email}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          {kontoProjekt && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate">Projekt „{kontoProjekt.name}“</span>
                  <span
                    className={cn(
                      "text-xs text-foreground",
                      stand?.stand === "fehler" && "text-[var(--status-ausschluss-fg)]"
                    )}
                  >
                    {speicherText(stand)}
                  </span>
                  {stand?.stand === "fehler" && (
                    <span className="text-xs leading-snug text-muted-foreground">{stand.text}</span>
                  )}
                </DropdownMenuLabel>
                {stand?.stand === "fehler" && (
                  <DropdownMenuItem
                    closeOnClick={false}
                    onClick={() => void speichereJetzt(kontoProjekt.id).catch(() => undefined)}
                  >
                    <CloudUpload aria-hidden /> Erneut versuchen
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await speichereAlles();
              await abmelden();
            }}
          >
            <LogOut aria-hidden /> Abmelden
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setLoeschenOffen(true)}>
            <Trash2 aria-hidden /> Konto löschen …
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <KontoLoeschenDialog offen={loeschenOffen} setOffen={setLoeschenOffen} />
    </>
  );
}

function KontoLoeschenDialog({ offen, setOffen }: { offen: boolean; setOffen: (o: boolean) => void }) {
  const { kontoLoeschen } = useKonto();
  const { projekte } = useProjekte();
  const [verstanden, setVerstanden] = useState(false);
  const [fehler, setFehler] = useState("");
  const [loescht, setLoescht] = useState(false);
  const anzahl = projekte.filter((p) => p.ort === "konto").length;

  function oeffnen(o: boolean) {
    setOffen(o);
    if (o) {
      setVerstanden(false);
      setFehler("");
    }
  }

  async function loeschen() {
    setFehler("");
    setLoescht(true);
    try {
      await kontoLoeschen();
      setOffen(false);
    } catch (e) {
      setFehler(meldung(e, "Das Konto ließ sich nicht löschen."));
    } finally {
      setLoescht(false);
    }
  }

  return (
    <Dialog open={offen} onOpenChange={oeffnen}>
      <DialogContent className="sm:max-w-[440px]" data-testid="konto-loeschen-dialog">
        <DialogHeader>
          <DialogTitle>
            Konto und {anzahl === 1 ? "1 Projekt" : `${anzahl} Projekte`} endgültig löschen?
          </DialogTitle>
          <DialogDescription>
            Gelöscht werden das Konto und alle darin gespeicherten Projekte. Projekte, die nur in diesem Browser liegen, bleiben erhalten.
            Das lässt sich nicht rückgängig machen.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={verstanden}
            onChange={(e) => setVerstanden(e.target.checked)}
            className="mt-0.5 accent-[var(--primaer)]"
            data-testid="konto-loeschen-verstanden"
          />
          Ich habe verstanden, dass Konto und Projekte endgültig gelöscht werden.
        </label>
        {fehler && (
          <p role="alert" className="text-sm text-[var(--status-ausschluss-fg)]">
            {fehler}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => oeffnen(false)}>
            Abbrechen
          </Button>
          <Button type="button" variant="destructive" disabled={!verstanden || loescht} onClick={() => void loeschen()}>
            {loescht ? "Konto wird gelöscht …" : "Konto löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
