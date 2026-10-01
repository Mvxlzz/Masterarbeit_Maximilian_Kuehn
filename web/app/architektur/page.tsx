"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ExternalLink, Play } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ArchitekturDiagramm } from "@/components/architektur/diagramm";
import { SeitenKopf } from "@/components/szenarien/teile";
import { Button } from "@/components/ui/button";
import { ApiFehler, bewerten, holeReferenzmodell } from "@/lib/api";
import { BAUSTEINE, DURCHLAUF, GRUPPEN } from "@/lib/architektur";
import { punkte } from "@/lib/format";
import { alternativName } from "@/lib/projekte";

const SCHRITT_MS = 750;

type Wert = { schluessel: string; name: string; nutzwert: number };
type Lauf =
  | { stand: "bereit" }
  | { stand: "laeuft" }
  | { stand: "fertig"; werte: Wert[] }
  | { stand: "fehler"; text: string };

/**
 * Architektur der Web-App: wer rechnet, wer nur darstellt und wie ein Fall durch das System läuft. Die Werte
 * beim „Durchlauf zeigen“ kommen aus POST /bewerten, das Diagramm selbst enthält keine Zahlen.
 */
export default function ArchitekturPage() {
  const { resolvedTheme } = useTheme();
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [erledigt, setErledigt] = useState<string[]>([]);
  const [lauf, setLauf] = useState<Lauf>({ stand: "bereit" });
  const zeitgeber = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => zeitgeber.current.forEach(clearTimeout), []);

  async function durchlaufZeigen() {
    zeitgeber.current.forEach(clearTimeout);
    zeitgeber.current = [];
    setGewaehlt(null);
    setErledigt([]);
    setLauf({ stand: "laeuft" });
    const warten = (ms: number) =>
      new Promise<void>((ok) => {
        zeitgeber.current.push(setTimeout(ok, ms));
      });
    // Anfrage sofort starten, die Linien leuchten währenddessen der Reihe nach auf
    const antwort = (async () => {
      const datei = await holeReferenzmodell();
      const ergebnis = await bewerten(datei);
      return { datei, ergebnis };
    })();
    try {
      for (const id of DURCHLAUF) {
        setAktiv(id);
        await warten(SCHRITT_MS);
        setErledigt((alt) => [...alt, id]);
      }
      const { datei, ergebnis } = await antwort;
      setAktiv(null);
      setLauf({
        stand: "fertig",
        werte: ergebnis.rangfolge.map((s) => ({
          schluessel: s,
          name: alternativName(datei, s),
          nutzwert: ergebnis.nutzwert[s],
        })),
      });
    } catch (e) {
      setAktiv(null);
      setLauf({ stand: "fehler", text: e instanceof ApiFehler ? e.message : "Die Schnittstelle antwortet nicht." });
    }
  }

  const baustein = BAUSTEINE.find((b) => b.id === gewaehlt);

  return (
    <AppShell panel={<ErklaerPanel baustein={baustein} lauf={lauf} onZurueck={() => setGewaehlt(null)} />}>
      <SeitenKopf
        titel="Architektur"
        abschnitt="Kapitel 5"
        text="Wer rechnet, wer nur darstellt und wie ein Fall durch das System läuft. Gerechnet wird ausschließlich im Rechenkern; Oberfläche und Schnittstelle reichen die Fall-Datei weiter und zeigen das Ergebnis an. Wählen Sie einen Baustein für seine Erklärung."
        aktionen={
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => void durchlaufZeigen()}
              disabled={lauf.stand === "laeuft"}
              data-testid="durchlauf-knopf"
            >
              <Play /> {lauf.stand === "laeuft" ? "Durchlauf läuft …" : "Durchlauf zeigen"}
            </Button>
            <Button size="sm" variant="secondary" nativeButton={false} render={<Link href="/architektur/abbildung" />}>
              <ExternalLink /> Als Abbildung
            </Button>
          </>
        }
      />

      <section
        aria-label="Architekturdiagramm"
        className="relative h-[calc(100vh-230px)] min-h-[520px] overflow-hidden rounded-lg border border-dashed border-[var(--linie-stark)]"
        data-testid="architektur-diagramm"
      >
        <ArchitekturDiagramm
          gewaehlt={gewaehlt}
          onWaehle={setGewaehlt}
          durchlauf={{ aktiv, erledigt }}
          dunkel={resolvedTheme !== "light"}
        />
      </section>

      <section className="mt-8 max-w-[1120px]" aria-labelledby="architektur-tabelle">
        <h2 id="architektur-tabelle" className="mb-3 text-base font-medium">
          Inhalt des Diagramms als Tabelle
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed text-sm" data-testid="architektur-tabelle">
            <thead className="bg-[var(--flaeche-zweit)] text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-[22%] px-3 py-2 font-medium">Schicht</th>
                <th className="w-[22%] px-3 py-2 font-medium">Baustein</th>
                <th className="px-3 py-2 font-medium">Bestandteile</th>
              </tr>
            </thead>
            <tbody>
              {[...GRUPPEN.map((g) => g.id), undefined].flatMap((gid) =>
                BAUSTEINE.filter((b) => b.gruppe === gid).map((b) => (
                  <tr key={b.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 text-muted-foreground">
                      {GRUPPEN.find((g) => g.id === gid)?.titel ?? "neben der Oberfläche"}
                    </td>
                    <td className="px-3 py-2 font-medium">{b.titel}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {b.zeilen.map((z) => (z.art ? `${z.text} (${z.art})` : z.text)).join(" · ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function ErklaerPanel({
  baustein,
  lauf,
  onZurueck,
}: {
  baustein: (typeof BAUSTEINE)[number] | undefined;
  lauf: Lauf;
  onZurueck: () => void;
}) {
  if (baustein) {
    const gruppe = GRUPPEN.find((g) => g.id === baustein.gruppe);
    return (
      <div className="flex flex-col gap-4 text-sm" data-testid="architektur-panel">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {gruppe?.titel ?? "Zusatz"}
          </p>
          <h2 className="mt-1 text-lg font-medium">{baustein.titel}</h2>
        </div>
        <p className="text-muted-foreground">{baustein.erklaerung.zweck}</p>
        {baustein.erklaerung.formeln && (
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">Formeln der Arbeit</h3>
            <p className="font-mono text-[13px]">{baustein.erklaerung.formeln}</p>
          </div>
        )}
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Dateien</h3>
          <ul className="space-y-0.5 font-mono text-[12px]">
            {baustein.erklaerung.dateien.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          {baustein.erklaerung.link && (
            <Button size="sm" variant="secondary" nativeButton={false} render={<Link href={baustein.erklaerung.link.href} />}>
              {baustein.erklaerung.link.text} →
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onZurueck}>
            Zur Übersicht
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5 text-sm" data-testid="architektur-panel">
      <div>
        <h2 className="text-lg font-medium">So lesen Sie das Diagramm</h2>
        <p className="mt-1 text-muted-foreground">
          Oben die Oberfläche im Browser, darunter die Schnittstelle und der Rechenkern, unten Daten, Nachweis und Tests.
        </p>
      </div>
      <ul className="space-y-2 text-muted-foreground">
        <li>
          <span className="mr-2 text-foreground">◆</span>zentraler Teil
        </li>
        <li>
          <span className="mr-2">◇</span>unterstützender Teil
        </li>
        <li>
          <span className="mr-2 inline-block h-3 w-5 rounded-sm border-[1.5px] border-[var(--primaer)] bg-[var(--marke-tint)] align-middle" />
          Rechenkern, einzige Stelle, an der gerechnet wird
        </li>
        <li>
          <span className="mr-2 inline-block h-3 w-5 rounded-sm border border-dashed border-[var(--linie-stark)] align-middle" />
          Konten: optional, nicht Teil der Arbeit
        </li>
      </ul>
      <div className="rounded-lg border border-border p-3" aria-live="polite" data-testid="durchlauf-ergebnis">
        <h3 className="mb-1 font-medium">Durchlauf</h3>
        {lauf.stand === "bereit" && (
          <p className="text-muted-foreground">
            „Durchlauf zeigen“ schickt den Referenzfall an die Schnittstelle und zeigt, welchen Weg er nimmt.
          </p>
        )}
        {lauf.stand === "laeuft" && <p className="text-muted-foreground">Der Referenzfall läuft durch die Schichten …</p>}
        {lauf.stand === "fehler" && (
          <p role="alert" className="text-[var(--status-ausschluss-fg)]">
            {lauf.text}
          </p>
        )}
        {lauf.stand === "fertig" && (
          <>
            <p className="mb-2 text-muted-foreground">Gesamtnutzwerte aus der Antwort von POST /bewerten:</p>
            <ol className="space-y-1">
              {lauf.werte.map((w, i) => (
                <li key={w.schluessel} className="flex items-baseline gap-2">
                  <span className="w-4 text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{w.name}</span>
                  <span className="font-mono font-medium">{punkte(w.nutzwert)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
