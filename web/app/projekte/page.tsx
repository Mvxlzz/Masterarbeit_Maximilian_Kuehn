"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CloudUpload,
  Grid2x2,
  List,
  MoreVertical,
  Plus,
  Search,
  Upload,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useKonto } from "@/components/konto-provider";
import { leseFortschritt } from "@/components/einfuehrung/station-seite";
import { useProjekte } from "@/components/projekte-provider";
import type { Projekt } from "@/lib/projekte";
import { REFERENZ_ID, alternativName, geaendertText } from "@/lib/projekte";
import { bewerten } from "@/lib/api";
import { punkte } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function pilleText(p: Projekt): string {
  if (p.referenz) return "Referenzfall";
  if (p.ort === "konto") return "Im Konto";
  if (p.grundlage === "import") return "Import";
  return p.basis === "kopie" ? "Kopie Kurbelwelle" : "Leere Vorlage";
}

function ziel(p: Projekt): string {
  if (p.referenz || p.basis === "kopie") return "/ergebnis";
  return "/fall/datenblatt";
}

const DOT: Record<string, string> = {
  intern: "var(--alt-intern)",
  extern: "var(--alt-extern)",
  neuteil: "var(--alt-neuteil)",
};

export default function ProjektePage() {
  const {
    projekte,
    bereit,
    oeffnen,
    anlegen,
    umbenennen,
    duplizieren,
    loeschen,
    importieren,
    exportiereJson,
    angemeldet,
    kontoListe,
    ladeKontoListe,
    verschiebeInsKonto,
    ladeProjektdatei,
    aktualisiereErgebnis,
  } = useProjekte();
  const { konfiguriert } = useKonto();
  const router = useRouter();

  const [suche, setSuche] = useState("");
  const [sortierung, setSortierung] = useState<"name" | "geaendert">("name");
  const [ansicht, setAnsicht] = useState<"raster" | "liste">("raster");
  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<Projekt | null>(null);
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [grundlage, setGrundlage] = useState<"leer" | "kopie">("leer");
  const [nameFehler, setNameFehler] = useState("");
  const [wirdAngelegt, setWirdAngelegt] = useState(false);
  const [importFehler, setImportFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  const [loeschenBestaetigen, setLoeschenBestaetigen] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const liste = projekte.filter(
      (p) => !q || `${p.name} ${p.beschreibung ?? ""}`.toLowerCase().includes(q)
    );
    return liste.sort((a, b) =>
      sortierung === "name"
        ? a.name.localeCompare(b.name, "de")
        : b.geaendert.localeCompare(a.geaendert) || a.name.localeCompare(b.name, "de")
    );
  }, [projekte, suche, sortierung]);

  const imKonto = gefiltert.filter((p) => p.ort === "konto");
  const imBrowser = gefiltert.filter((p) => p.ort !== "konto");

  // Rang 1 für Konto-Projekte, die in diesem Browser noch nicht bewertet wurden (nacheinander, im Hintergrund)
  const bewertet = useRef(new Set<string>());
  useEffect(() => {
    if (kontoListe.stand !== "bereit") return;
    const offen = projekte.filter(
      (p) => p.ort === "konto" && p.nutzwertRang1 === undefined && !bewertet.current.has(p.id)
    );
    if (offen.length === 0) return;
    for (const p of offen) bewertet.current.add(p.id);
    void (async () => {
      for (const p of offen) {
        try {
          aktualisiereErgebnis(p.id, await bewerten(await ladeProjektdatei(p.id)));
        } catch {
          // Prüffehler oder Netz: Kachel bleibt „Noch nicht bewertet“
        }
      }
    })();
  }, [kontoListe.stand, projekte, ladeProjektdatei, aktualisiereErgebnis]);

  async function aktion(fn: () => Promise<unknown>, standard: string) {
    setMeldung("");
    try {
      await fn();
    } catch (e) {
      setMeldung(e instanceof Error && e.message ? e.message : standard);
    }
  }

  const tutorialPasst =
    !suche.trim() || "einführung tutorial einstieg stationen".includes(suche.trim().toLowerCase());

  function dialogOeffnen(p: Projekt | null) {
    setBearbeiten(p);
    setName(p?.name ?? "");
    setBeschreibung(p?.beschreibung ?? "");
    setGrundlage("leer");
    setNameFehler("");
    setDialogOffen(true);
  }

  async function absenden() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameFehler("Bitte geben Sie einen Namen ein, am besten die Bezeichnung des Bauteils.");
      return;
    }
    const doppelt = projekte.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase() && p.id !== bearbeiten?.id
    );
    if (doppelt) {
      setNameFehler("Ein Projekt mit diesem Namen gibt es schon. Bitte wählen Sie einen anderen Namen.");
      return;
    }
    if (bearbeiten) {
      setWirdAngelegt(true);
      try {
        await umbenennen(bearbeiten.id, trimmed, beschreibung.trim());
        setDialogOffen(false);
      } catch (e) {
        setNameFehler(e instanceof Error ? e.message : "Das Projekt ließ sich nicht umbenennen.");
      } finally {
        setWirdAngelegt(false);
      }
      return;
    }
    setWirdAngelegt(true);
    try {
      const projekt = await anlegen({ name: trimmed, beschreibung: beschreibung.trim(), grundlage });
      setDialogOffen(false);
      oeffnen(projekt.id);
      router.push(ziel(projekt));
    } catch (e) {
      setNameFehler(e instanceof Error ? e.message : "Das Projekt konnte nicht angelegt werden.");
    } finally {
      setWirdAngelegt(false);
    }
  }

  async function datenImportieren(datei: File) {
    setImportFehler("");
    try {
      const text = await datei.text();
      const inhalt = JSON.parse(text);
      const projekt = await importieren(inhalt, datei.name.replace(/\.json$/i, ""));
      oeffnen(projekt.id);
      router.push(ziel(projekt));
    } catch (e) {
      setImportFehler(
        e instanceof Error ? e.message : "Die Datei ist kein gültiges JSON."
      );
    }
  }

  function kachel(p: Projekt) {
    return (
      <Kachel
        key={p.id}
        projekt={p}
        liste={ansicht === "liste"}
        href={ziel(p)}
        onOeffnen={() => {
          oeffnen(p.id);
        }}
        onUmbenennen={() => dialogOeffnen(p)}
        onDuplizieren={() => void aktion(() => duplizieren(p.id), "Das Projekt ließ sich nicht duplizieren.")}
        onExport={() => void aktion(() => exportiereJson(p.id), "Der Export ist fehlgeschlagen.")}
        onVerschieben={
          angemeldet && p.ort !== "konto" && p.id !== REFERENZ_ID
            ? () => void aktion(() => verschiebeInsKonto(p.id), "Das Projekt ließ sich nicht verschieben.")
            : undefined
        }
        loeschenBestaetigen={loeschenBestaetigen === p.id}
        onLoeschenKlick={() => {
          if (loeschenBestaetigen === p.id) {
            setLoeschenBestaetigen(null);
            void aktion(() => loeschen(p.id), "Das Projekt ließ sich nicht löschen.");
          } else {
            setLoeschenBestaetigen(p.id);
          }
        }}
      />
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px]">
        <h1 className="mb-8 text-2xl font-medium tracking-tight">Projekte</h1>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex h-8 w-full max-w-[300px] items-center gap-2 rounded-lg border border-input bg-secondary px-2.5 text-muted-foreground">
            <Search className="size-3.5 shrink-0" />
            <input
              type="search"
              placeholder="Projekt suchen"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSortierung((s) => (s === "name" ? "geaendert" : "name"))}
          >
            {sortierung === "name" ? "Sortiert nach Name" : "Sortiert nach Änderung"}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex gap-0.5 rounded-lg border border-border p-0.5">
              <button
                type="button"
                aria-pressed={ansicht === "raster"}
                title="Kacheln"
                onClick={() => setAnsicht("raster")}
                className={cn(
                  "grid size-7 place-items-center rounded-md text-muted-foreground",
                  ansicht === "raster" && "bg-accent text-foreground"
                )}
              >
                <Grid2x2 className="size-3.5" />
              </button>
              <button
                type="button"
                aria-pressed={ansicht === "liste"}
                title="Liste"
                onClick={() => setAnsicht("liste")}
                className={cn(
                  "grid size-7 place-items-center rounded-md text-muted-foreground",
                  ansicht === "liste" && "bg-accent text-foreground"
                )}
              >
                <List className="size-3.5" />
              </button>
            </div>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const datei = e.target.files?.[0];
                if (datei) void datenImportieren(datei);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
              <Upload /> Importieren
            </Button>
            <Button type="button" size="sm" onClick={() => dialogOeffnen(null)}>
              <Plus /> Neues Projekt
            </Button>
          </div>
        </div>

        {importFehler && (
          <p className="mb-4 rounded-md border border-[var(--status-ausschluss-rand)] bg-[var(--status-ausschluss-bg)] px-3 py-2 text-sm text-[var(--status-ausschluss-fg)]">
            {importFehler}
          </p>
        )}

        {meldung && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-[var(--status-ausschluss-rand)] bg-[var(--status-ausschluss-bg)] px-3 py-2 text-sm text-[var(--status-ausschluss-fg)]"
          >
            {meldung}
          </p>
        )}

        {!bereit && angemeldet ? (
          <Raster liste={ansicht === "liste"}>
            <Skeleton className="h-[176px] rounded-xl" />
            <Skeleton className="h-[176px] rounded-xl" />
          </Raster>
        ) : !bereit ? null : (
          <>
            {angemeldet && (
              <section aria-labelledby="gruppe-konto" className="mb-8" data-testid="gruppe-konto">
                <Gruppenkopf id="gruppe-konto" titel="Im Konto" anzahl={imKonto.length} />
                {kontoListe.stand === "fehler" ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--status-ausschluss-rand)] bg-[var(--status-ausschluss-bg)] px-3 py-2 text-sm text-[var(--status-ausschluss-fg)]">
                    <span role="alert">{kontoListe.text}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void ladeKontoListe()}>
                      Erneut versuchen
                    </Button>
                  </div>
                ) : imKonto.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-5 py-6 text-sm text-muted-foreground">
                    {suche.trim()
                      ? "Kein Projekt im Konto passt zur Suche."
                      : "Noch keine Projekte im Konto. Legen Sie ein neues an oder verschieben Sie ein Projekt aus diesem Browser über das Menü ⋮."}
                  </p>
                ) : (
                  <Raster liste={ansicht === "liste"}>
                    {imKonto.map((p) => kachel(p))}
                  </Raster>
                )}
              </section>
            )}
            <section aria-labelledby={angemeldet ? "gruppe-browser" : undefined} data-testid="gruppe-browser">
              {angemeldet && (
                <Gruppenkopf id="gruppe-browser" titel="Nur in diesem Browser" anzahl={imBrowser.length} />
              )}
              <Raster liste={ansicht === "liste"}>
                {imBrowser.map((p) => kachel(p))}
                {tutorialPasst && <TutorialKachel liste={ansicht === "liste"} />}
              </Raster>
            </section>
          </>
        )}

        {bereit && gefiltert.length === 0 && !tutorialPasst && (
          <p className="py-8 text-sm text-muted-foreground">Kein Projekt passt zur Suche.</p>
        )}

        <p className="mt-6 text-xs text-[var(--text-dritt)]" data-testid="projekte-fusszeile">
          {angemeldet
            ? "Projekte im Konto werden automatisch gespeichert. Projekte in diesem Browser sichern Sie über das Menü ⋮ als JSON-Datei oder verschieben sie ins Konto."
            : konfiguriert
              ? "Gastmodus: Projekte bleiben in diesem Browser. Sichern Sie ein Projekt über das Menü ⋮ als JSON-Datei, oder melden Sie sich an, um Projekte im Konto zu speichern."
              : "Gastmodus: Projekte werden nicht auf einem Server gespeichert. Sichern Sie ein Projekt über das Menü ⋮ als JSON-Datei."}
        </p>
      </div>

      <Dialog open={dialogOffen} onOpenChange={setDialogOffen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{bearbeiten ? "Projekt umbenennen" : "Neues Projekt"}</DialogTitle>
            <DialogDescription>
              Ein Projekt ist ein Bauteil, das Sie bewerten. Benennen Sie es am besten nach dem
              Bauteil.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void absenden();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="projekt-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="projekt-name"
                value={name}
                maxLength={80}
                placeholder="z. B. Pleuel Baureihe 900"
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setNameFehler("");
                }}
                aria-invalid={!!nameFehler}
              />
              {nameFehler && <span className="text-xs text-destructive">{nameFehler}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="projekt-beschreibung" className="text-sm font-medium">
                Beschreibung <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="projekt-beschreibung"
                rows={3}
                maxLength={240}
                placeholder="z. B. Werkstoff, Masse, Schaden und Schadensgrad"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
              />
            </div>
            {!bearbeiten && (
              <fieldset className="flex flex-col gap-1.5">
                <legend className="text-sm font-medium">Grundlage</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["leer", "Leere Vorlage", "Felder und Formeln selbst anlegen"],
                      ["kopie", "Kopie der Kurbelwelle", "alle Felder, Formeln und Gewichte übernehmen"],
                    ] as const
                  ).map(([wert, titel, text]) => (
                    <label
                      key={wert}
                      className={cn(
                        "flex cursor-pointer gap-2 rounded-lg border border-input p-2.5",
                        grundlage === wert && "border-primary bg-primary/10"
                      )}
                    >
                      <input
                        type="radio"
                        name="grundlage"
                        value={wert}
                        checked={grundlage === wert}
                        onChange={() => setGrundlage(wert)}
                        className="mt-0.5 accent-[var(--primaer)]"
                      />
                      <span>
                        <strong className="block text-sm font-medium">{titel}</strong>
                        <span className="text-xs text-muted-foreground">{text}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOffen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={wirdAngelegt}>
                {bearbeiten ? "Speichern" : wirdAngelegt ? "Wird angelegt …" : "Projekt anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Kachel({
  projekt,
  liste,
  href,
  onOeffnen,
  onUmbenennen,
  onDuplizieren,
  onExport,
  onVerschieben,
  onLoeschenKlick,
  loeschenBestaetigen,
}: {
  projekt: Projekt;
  liste: boolean;
  href: string;
  onOeffnen: () => void;
  onUmbenennen: () => void;
  onDuplizieren: () => void;
  onExport: () => void;
  onVerschieben?: () => void;
  onLoeschenKlick: () => void;
  loeschenBestaetigen: boolean;
}) {
  const bewertet = projekt.nutzwertRang1 !== undefined && projekt.rang1Name;
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5 transition-colors hover:border-muted-foreground/40 hover:bg-accent/40",
        liste ? "min-h-0 flex-row flex-wrap items-center gap-3 border-0 border-b p-3.5 last:border-b-0" : "min-h-[176px]"
      )}
    >
      <Link
        href={href}
        onClick={onOeffnen}
        className={cn(
          "text-left text-sm font-medium leading-snug hover:underline",
          liste ? "min-w-[220px]" : "pr-7"
        )}
      >
        {projekt.name}
      </Link>
      <div
        className={cn(
          "text-sm text-muted-foreground",
          liste ? "min-w-[200px] flex-1 truncate" : "line-clamp-3",
          !projekt.beschreibung && "italic text-[var(--text-dritt)]"
        )}
      >
        {projekt.beschreibung || "Keine Beschreibung"}
      </div>
      <div className={cn("flex flex-wrap gap-1.5", liste && "m-0")}>
        <span className="inline-flex h-5 items-center rounded-full border border-border bg-secondary px-2 text-[11px] font-medium text-muted-foreground">
          {pilleText(projekt)}
        </span>
        <span className="inline-flex h-5 items-center rounded-full border border-border bg-secondary px-2 text-[11px] font-medium text-muted-foreground">
          {geaendertText(projekt)}
        </span>
      </div>
      <div className={cn("mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground", liste && "m-0 p-0")}>
        {bewertet ? (
          <>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: DOT[projekt.rang1Name ?? ""] ?? "var(--text-gedaempft)" }}
            />
            <span className="truncate">{alternativName(projekt.datei, projekt.rang1Name ?? "")}</span>
            <span className="font-mono font-medium text-foreground">
              {punkte(projekt.nutzwertRang1)}
            </span>
          </>
        ) : (
          <span>Noch nicht bewertet</span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Aktionen für ${projekt.name}`}
          className={cn(
            "grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
            liste ? "static" : "absolute top-3.5 right-3"
          )}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={() => {
              onOeffnen();
              window.location.assign(href);
            }}
          >
            Öffnen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUmbenennen}>Umbenennen</DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplizieren}>Duplizieren</DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>Als JSON exportieren</DropdownMenuItem>
          {onVerschieben && (
            <DropdownMenuItem onClick={onVerschieben}>
              <CloudUpload aria-hidden /> Ins Konto verschieben
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={projekt.id === REFERENZ_ID}
            onClick={onLoeschenKlick}
          >
            {projekt.id === REFERENZ_ID
              ? "Der Referenzfall bleibt immer erhalten"
              : loeschenBestaetigen
                ? "Wirklich löschen?"
                : "Löschen"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}

function TutorialKachel({ liste }: { liste: boolean }) {
  // Fortsetzen, wo man aufgehört hat (nur im Browser gemerkt)
  const [fortschritt, setFortschritt] = useState<{ besucht: number[]; zuletzt: number } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFortschritt(leseFortschritt());
  }, []);
  const begonnen = Boolean(fortschritt && fortschritt.besucht.length > 0);
  return (
    <Link
      href="/einfuehrung"
      aria-label={begonnen ? `Einführung fortsetzen bei Station ${fortschritt?.zuletzt}` : "Einführung starten"}
      className={cn(
        "group flex flex-col gap-1.5 rounded-xl border border-dashed border-border bg-transparent p-5 transition-colors hover:border-[var(--linie-stark)] hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fokus)]",
        liste ? "min-h-0 flex-row flex-wrap items-center gap-3 border-0 border-b p-3.5" : "min-h-[176px]"
      )}
    >
      <span className="mb-1 grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
        <BookOpen className="size-4" strokeWidth={1.5} />
      </span>
      <span className="text-sm font-medium">Einführung</span>
      <div className={cn("text-sm text-muted-foreground", liste ? "min-w-[200px] flex-1 truncate" : "line-clamp-3")}>
        Zehn Stationen durch die Kurbelwelle: Gate, drei Dimensionen, Normalisierung, Ergebnis,
        Sensitivität und Szenarien, jeweils mit Formel und eingesetzten Werten. Ändert kein Projekt.
      </div>
      <div className="mt-auto pt-3 text-xs font-medium text-primary group-hover:underline">
        {begonnen ? `Fortsetzen bei Station ${fortschritt?.zuletzt} →` : "Einführung starten →"}
      </div>
    </Link>
  );
}

function Raster({ liste, children }: { liste: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        liste
          ? "flex flex-col overflow-hidden rounded-xl border border-border"
          : "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
      )}
    >
      {children}
    </div>
  );
}

function Gruppenkopf({ id, titel, anzahl }: { id: string; titel: string; anzahl: number }) {
  return (
    <h2 id={id} className="mb-3 font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      {titel} ({anzahl})
    </h2>
  );
}
