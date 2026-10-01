"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Flag } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  BalkenKarte,
  EingabenKarte,
  FormelKarte,
  RechenwegKarte,
  Stationsliste,
  Stufenbild,
  TabelleKarte,
} from "@/components/einfuehrung/bausteine";
import { useProjekte } from "@/components/projekte-provider";
import { TornadoSektion } from "@/components/sensitivitaet/tornado";
import { VerlaufSektion } from "@/components/sensitivitaet/verlauf";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiFehler,
  bewerten,
  holeReferenzmodell,
  holeTutorial,
  type FallDatei,
  type ModellErgebnis,
  type TutorialAntwort,
} from "@/lib/api";

const SPEICHER = "einfuehrung-fortschritt";

type Fortschritt = { besucht: number[]; zuletzt: number };

/** Zuletzt angesehene Station, damit „Einführung starten“ dort fortsetzt. Nur Komfort im Browser. */
export function leseFortschritt(): Fortschritt {
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) ?? "null");
    if (roh && Array.isArray(roh.besucht) && typeof roh.zuletzt === "number") return roh;
  } catch {
    // Gastmodus ohne Speicher
  }
  return { besucht: [], zuletzt: 1 };
}

function merkeStation(nr: number): Fortschritt {
  const f = leseFortschritt();
  const neu = { besucht: [...new Set([...f.besucht, nr])].sort((a, b) => a - b), zuletzt: nr };
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(neu));
  } catch {
    // ignorieren
  }
  return neu;
}

// Einmal je Sitzung laden: die Einführung ändert sich nicht, sie zeigt immer den Referenzfall.
let tutorialAnfrage: Promise<TutorialAntwort> | null = null;
function ladeTutorial(): Promise<TutorialAntwort> {
  tutorialAnfrage ??= holeTutorial().catch((e) => {
    tutorialAnfrage = null;
    throw e;
  });
  return tutorialAnfrage;
}

/** Station 9 zeigt Tornado und Verlauf live über die API, mit dem Referenzfall. */
function Sensitivitaet() {
  const [daten, setDaten] = useState<{ datei: FallDatei; ergebnis: ModellErgebnis } | null>(null);
  const [fehler, setFehler] = useState("");
  useEffect(() => {
    let abbruch = false;
    (async () => {
      try {
        const datei = await holeReferenzmodell();
        const ergebnis = await bewerten(datei);
        if (!abbruch) setDaten({ datei, ergebnis });
      } catch (e) {
        if (!abbruch) setFehler(e instanceof ApiFehler ? e.message : "Die Diagramme konnten nicht geladen werden.");
      }
    })();
    return () => {
      abbruch = true;
    };
  }, []);
  if (fehler) return <p className="text-sm text-[var(--status-ausschluss-fg)]">{fehler}</p>;
  if (!daten) return <Skeleton className="h-72 w-full" />;
  return (
    <div className="space-y-6">
      <TornadoSektion datei={daten.datei} ergebnis={daten.ergebnis} szenario={null} />
      <VerlaufSektion datei={daten.datei} ergebnis={daten.ergebnis} szenario={null} />
    </div>
  );
}

function Abschluss() {
  const { projekte, anlegen, oeffnen } = useProjekte();
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  async function uebernehmen() {
    setLaeuft(true);
    setFehler("");
    try {
      const namen = new Set(projekte.map((p) => p.name));
      let name = "Kurbelwelle, eigene Bewertung";
      for (let i = 2; namen.has(name); i++) name = `Kurbelwelle, eigene Bewertung ${i}`;
      const projekt = await anlegen({
        name,
        beschreibung: "Kopie des Referenzfalls aus der Einführung.",
        grundlage: "kopie",
      });
      oeffnen(projekt.id);
      router.push("/fall/datenblatt");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Das Projekt konnte nicht angelegt werden.");
      setLaeuft(false);
    }
  }

  return (
    <section
      aria-labelledby="abschluss-titel"
      className="leer-punkte rounded-xl border border-dashed border-border bg-card"
    >
      <div className="relative flex flex-col items-center gap-1.5 px-6 py-10 text-center">
        <span className="mb-1 grid size-10 place-items-center rounded-lg border border-border bg-secondary text-primary">
          <Flag className="size-[18px]" strokeWidth={1.5} />
        </span>
        <h2 id="abschluss-titel" className="text-base font-medium">
          Einführung abgeschlossen
        </h2>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          Sie kennen jetzt alle vier Verarbeitungsstufen am Referenzfall. Übernehmen Sie ihn als eigenes Projekt,
          um Werte, Formeln und Gewichte zu ändern, oder legen Sie unter „Projekte“ ein neues Bauteil an.
        </p>
        <div className="mt-3.5 flex flex-wrap justify-center gap-2">
          <Button onClick={uebernehmen} disabled={laeuft}>
            <Copy className="size-3.5" />
            {laeuft ? "Wird angelegt …" : "Als eigenes Projekt übernehmen"}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/projekte" />}>
            Zu den Projekten
          </Button>
        </div>
        {fehler && (
          <p role="alert" className="mt-2 text-sm text-[var(--status-ausschluss-fg)]">
            {fehler}
          </p>
        )}
      </div>
    </section>
  );
}

export function StationSeite({ nr }: { nr: number }) {
  const router = useRouter();
  const [tutorial, setTutorial] = useState<TutorialAntwort | null>(null);
  const [fehler, setFehler] = useState("");
  const [besucht, setBesucht] = useState<Set<number>>(new Set());

  useEffect(() => {
    let abbruch = false;
    ladeTutorial()
      .then((t) => !abbruch && setTutorial(t))
      .catch((e) => !abbruch && setFehler(e instanceof ApiFehler ? e.message : "Die Einführung konnte nicht geladen werden."));
    return () => {
      abbruch = true;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBesucht(new Set(merkeStation(nr).besucht));
  }, [nr]);

  const anzahl = tutorial?.stationen.length ?? 10;
  const gehe = useCallback(
    (ziel: number) => {
      if (ziel >= 1 && ziel <= anzahl) router.push(`/einfuehrung/${ziel}`);
    },
    [anzahl, router]
  );

  // Pfeiltasten blättern, außer beim Tippen in Feldern oder in Auswahllisten
  useEffect(() => {
    function taste(ev: KeyboardEvent) {
      const ziel = ev.target as HTMLElement | null;
      if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
      if (ziel?.closest("input, textarea, select, [role=listbox], [role=combobox], [role=slider], [role=tablist]"))
        return;
      if (ev.key === "ArrowRight") gehe(nr + 1);
      if (ev.key === "ArrowLeft") gehe(nr - 1);
    }
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [gehe, nr]);

  const station = tutorial?.stationen.find((s) => s.nr === nr);

  return (
    <AppShell
      seitenspalte={
        tutorial ? (
          <Stationsliste stationen={tutorial.stationen} aktuell={nr} besucht={besucht} />
        ) : (
          <Skeleton className="h-80 w-full" />
        )
      }
    >
      <div className="mx-auto max-w-[1040px] pb-10">
        {fehler && (
          <p role="alert" className="text-sm text-[var(--status-ausschluss-fg)]">
            {fehler}
          </p>
        )}
        {!tutorial && !fehler && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {tutorial && !station && (
          <p className="text-sm">
            Diese Station gibt es nicht. <Link href="/einfuehrung/1" className="text-primary underline">Zur ersten Station</Link>
          </p>
        )}
        {tutorial && station && (
          <article aria-labelledby="station-titel">
            <header className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span className="text-primary">
                  Station {station.nr} von {anzahl}
                </span>
                <span aria-hidden>·</span>
                <span className="normal-case tracking-normal">{station.abschnitt}</span>
              </div>
              <h1 id="station-titel" className="text-2xl font-medium tracking-tight">
                {station.titel}
              </h1>
              <div className="mt-3 max-w-[72ch] space-y-2 text-[15px] leading-relaxed text-muted-foreground blocksatz">
                {station.text.map((absatz) => (
                  <p key={absatz}>{absatz}</p>
                ))}
              </div>
            </header>

            <div className="space-y-6">
              {station.nr === 1 && <Stufenbild stufen={tutorial.stufen} />}
              {station.eingaben && <EingabenKarte tabelle={station.eingaben} />}
              {station.formeln.map((f) => (
                <FormelKarte key={f.titel} formel={f} />
              ))}
              {station.satz && <p className="text-sm">{station.satz}</p>}
              {station.balken && (
                <BalkenKarte
                  balken={station.balken}
                  farbe={station.nr === 6 ? "var(--dim-oekol)" : "var(--dim-oekon)"}
                />
              )}
              {station.tabellen.map((t) => (
                <TabelleKarte key={t.titel} tabelle={t} klein={t.spalten.length > 4} />
              ))}
              {station.nr === 9 && <Sensitivitaet />}
              {station.rechenweg.length > 0 && (
                <div className="space-y-4">
                  {station.rechenweg.map((r) => (
                    <RechenwegKarte key={r.titel} rechenweg={r} />
                  ))}
                  <p className="text-xs text-muted-foreground">{tutorial.rundung}</p>
                </div>
              )}
              {station.nr === anzahl && <Abschluss />}
            </div>

            <nav
              aria-label="Zwischen Stationen blättern"
              className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4"
            >
              <Button variant="outline" onClick={() => gehe(nr - 1)} disabled={nr <= 1}>
                <ArrowLeft className="size-3.5" />
                Zurück
              </Button>
              <span className="text-xs text-muted-foreground">
                Station {nr} von {anzahl} · Pfeiltasten ← → blättern
              </span>
              {nr < anzahl ? (
                <Button onClick={() => gehe(nr + 1)}>
                  Weiter: {tutorial.stationen[nr]?.titel}
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button variant="outline" nativeButton={false} render={<Link href="/projekte" />}>
                  Zu den Projekten
                </Button>
              )}
            </nav>
          </article>
        )}
      </div>
    </AppShell>
  );
}
