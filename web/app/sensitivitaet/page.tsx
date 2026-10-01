"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Leerzustand } from "@/components/leerzustand";
import { useAktivesSzenario, useProjekte } from "@/components/projekte-provider";
import { GewichtsdreieckSektion } from "@/components/sensitivitaet/gewichtsdreieck";
import { KipppunktKarteSektion } from "@/components/sensitivitaet/kipppunkt-karte";
import { TornadoSektion } from "@/components/sensitivitaet/tornado";
import { VerlaufSektion } from "@/components/sensitivitaet/verlauf";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ApiFehler,
  bewerten,
  type FallDatei,
  type ModellErgebnis,
} from "@/lib/api";
import { kompakt, mitEinheit } from "@/lib/format";
import { aktivesSzenario, szenarioTitel } from "@/lib/projekte";
import { felderAusDatei } from "@/lib/sensitivitaet";
import { cn } from "@/lib/utils";

const SUBNAV = {
  titel: "Sensitivität",
  gruppen: [
    {
      label: "Analysen",
      eintraege: [
        { id: "tornado", label: "Tornado" },
        { id: "verlauf", label: "Verlauf" },
        { id: "karte", label: "Kipppunkt-Karte" },
        { id: "dreieck", label: "Gewichtsdreieck" },
      ],
    },
  ],
};

function SpannenTabelle({ datei, ergebnis }: { datei: FallDatei; ergebnis: ModellErgebnis }) {
  const felder = felderAusDatei(datei);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feld</TableHead>
            <TableHead>Bezeichnung</TableHead>
            <TableHead className="text-right">Wert</TableHead>
            <TableHead>Spanne</TableHead>
            <TableHead>Herkunft</TableHead>
            <TableHead>Quelle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {felder.map((f) => {
            const wert = ergebnis.werte[f.name] ?? f.wert;
            const spanne =
              f.spanne && f.spanne[0] !== f.spanne[1]
                ? `${kompakt(f.spanne[0])}–${kompakt(f.spanne[1])}${
                    f.einheit && f.einheit !== "—" ? ` ${f.einheit}` : ""
                  }`
                : "—";
            return (
              <TableRow key={f.name}>
                <TableCell className="font-mono text-xs">{f.name}</TableCell>
                <TableCell>{f.bezeichnung}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {mitEinheit(wert, f.einheit || "—")}
                </TableCell>
                <TableCell className="font-mono text-xs">{spanne}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded text-xs font-medium",
                      f.herkunft === "L" &&
                        "bg-[var(--herkunft-L-bg,#e8f0f8)] text-[var(--herkunft-L-fg,#1f4e79)]",
                      f.herkunft === "A" &&
                        "bg-[var(--herkunft-A-bg,#eef0f3)] text-[var(--herkunft-A-fg,#5f6368)]",
                      f.herkunft === "N" &&
                        "bg-[var(--herkunft-N-bg,#e9f6ed)] text-[var(--herkunft-N-fg,#146c2e)]"
                    )}
                    title={
                      f.herkunft === "L"
                        ? "Literatur"
                        : f.herkunft === "A"
                          ? "Annahme"
                          : "Nutzerangabe"
                    }
                  >
                    {f.herkunft}
                  </span>
                </TableCell>
                <TableCell
                  className="max-w-[28ch] truncate text-muted-foreground"
                  title={f.quelle}
                >
                  {f.quelle || "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function SensitivitaetPage() {
  const { offenesProjekt, ladeProjektdatei } = useProjekte();
  const { szenario } = useAktivesSzenario();
  const [datei, setDatei] = useState<FallDatei | null>(null);
  const [ergebnis, setErgebnis] = useState<ModellErgebnis | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");
  const projektId = offenesProjekt?.id;
  const szenarioWahl = offenesProjekt?.szenario;

  // Datei laden und im aktiven Szenario des Pfads bewerten. Die Projektkachel zeigt den Basisfall
  // und wird hier nicht geändert.
  useEffect(() => {
    if (!projektId) return;
    let abbruch = false;
    (async () => {
      setLaedt(true);
      setFehler("");
      try {
        const d = await ladeProjektdatei(projektId);
        if (abbruch) return;
        const e = await bewerten(d, aktivesSzenario(szenarioWahl, d));
        if (abbruch) return;
        setDatei(d);
        setErgebnis(e);
      } catch (e) {
        if (!abbruch) {
          setErgebnis(null);
          setFehler(
            e instanceof ApiFehler
              ? e.message
              : "Die Bewertung im gewählten Szenario ist fehlgeschlagen."
          );
        }
      } finally {
        if (!abbruch) setLaedt(false);
      }
    })();
    return () => {
      abbruch = true;
    };
    // Nur bei Projekt- oder Szenariowechsel neu laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projektId, szenario]);

  if (!offenesProjekt) {
    return (
      <AppShell>
        <header className="mb-6">
          <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Sensitivität</h1>
          <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
            Einparameter-Variation, Kipppunkte, Kipppunkt-Karte und Gewichtsdreieck.
          </p>
        </header>
        <Leerzustand
          icon={<Activity className="size-[18px]" strokeWidth={1.5} />}
          titel="Kein Projekt geöffnet"
          text="Öffnen Sie ein Projekt unter Projekte, dann erscheint hier seine Sensitivitätsanalyse."
        />
      </AppShell>
    );
  }

  return (
    <AppShell subnav={SUBNAV}>
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Sensitivität</h1>
            <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
              Wie stabil die Empfehlung ist: Einparameter-Variation, Verlauf mit Kipppunkten,
              Kipppunkt-Karte und Gewichtsdreieck.
            </p>
          </div>
        </div>
        <p className="mb-4 text-xs text-muted-foreground" data-testid="sensitivitaet-szenario">
          Szenario: <span className="font-medium text-foreground">{szenarioTitel(szenario, datei)}</span>.
          Sie wechseln es oben im Pfad.
        </p>

        <Tabs defaultValue="diagramme">
          <TabsList variant="line">
            <TabsTrigger value="diagramme">Diagramme</TabsTrigger>
            <TabsTrigger value="spannen">Spannen der Eingaben</TabsTrigger>
          </TabsList>

          <TabsContent value="diagramme" className="mt-6 space-y-10">
            {fehler && !ergebnis && (
              <div
                className="rounded-lg border border-[var(--status-warnung-fg)]/30 bg-[var(--status-warnung-bg,#fff4db)] px-4 py-3 text-sm text-[var(--status-warnung-fg)]"
                role="alert"
              >
                {fehler} Die Sensitivität braucht ein gültiges Modell und rechnet deshalb erst
                wieder, wenn die Meldungen unter „Fall bearbeiten“ behoben sind.
              </div>
            )}
            {laedt && !ergebnis && (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}
            {datei && ergebnis && (
              <>
                <TornadoSektion datei={datei} ergebnis={ergebnis} szenario={szenario} />
                <VerlaufSektion datei={datei} ergebnis={ergebnis} szenario={szenario} />
                <KipppunktKarteSektion datei={datei} ergebnis={ergebnis} szenario={szenario} />
                <GewichtsdreieckSektion datei={datei} ergebnis={ergebnis} szenario={szenario} />
              </>
            )}
          </TabsContent>

          <TabsContent value="spannen" className="mt-6">
            <p className="mb-4 max-w-[72ch] text-sm text-muted-foreground blocksatz">
              Unter- und Obergrenze jeder Eingabe für Tornado und Verlauf, mit Herkunft (L)
              Literatur, (A) Annahme, (N) Nutzerangabe.
            </p>
            {datei && ergebnis ? (
              <SpannenTabelle datei={datei} ergebnis={ergebnis} />
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </TabsContent>
        </Tabs>
      </header>
    </AppShell>
  );
}
