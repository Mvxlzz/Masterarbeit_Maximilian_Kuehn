"use client";

import { useEffect, useMemo, useState } from "react";

import { FormelKarte } from "@/components/einfuehrung/bausteine";
import { useFall } from "@/components/fall/fall-provider";
import { useAktivesSzenario, useProjekte } from "@/components/projekte-provider";
import { SeitenKopf, ZeilenMeldung, useKatalog } from "@/components/szenarien/teile";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bausteineWerte,
  holeFormeln,
  type BausteineAntwort,
  type MethodenFormel,
} from "@/lib/api";
import { alternativen as altsAus, meldungenJeOrt } from "@/lib/fall";
import { LEER, UNBEGRENZT, rechenwert, zahl } from "@/lib/format";
import { aktivesSzenario, szenarioTitel } from "@/lib/projekte";
import {
  BAUSTEIN_FORMELN,
  bausteinOrt,
  bausteine as bausteineAus,
  setzeBausteine,
  setzeLieferzeit,
} from "@/lib/szenarien";

const KEIN_RUECKFALL = "__kein__";

type Zeile = { ziel: string; text: string; formel: string; einheit: string };

function wertText(w: number | null | undefined, ziel: string, einheit: string): string {
  if (w === undefined) return LEER;
  if (w === null) return ziel === "strafe_max" ? UNBEGRENZT : LEER;
  if (einheit === "—") return zahl(w, 2);
  return rechenwert(w, einheit);
}

export default function BausteinePage() {
  const { datei, meldungen, ergebnis, schreibgeschuetzt, aendereDatei } = useFall();
  const { offenesProjekt } = useProjekte();
  const { szenario } = useAktivesSzenario();
  const katalog = useKatalog();
  const [formeln, setFormeln] = useState<MethodenFormel[]>([]);
  const [werte, setWerte] = useState<BausteineAntwort | null>(null);
  const [werteFehler, setWerteFehler] = useState<string | null>(null);

  useEffect(() => {
    holeFormeln()
      .then((f) => setFormeln(f.filter((x) => ["(11)", "(12)", "(13)"].includes(x.nummer))))
      .catch(() => setFormeln([]));
  }, []);

  // Werte der Bausteine im aktiven Szenario, nach jedem gültigen Stand (kern.modell.bausteine_werte)
  useEffect(() => {
    if (!datei || !ergebnis) return;
    let ab = false;
    bausteineWerte(datei, aktivesSzenario(offenesProjekt?.szenario, datei))
      .then((w) => {
        if (ab) return;
        setWerte(w);
        setWerteFehler(null);
      })
      .catch((e) => {
        if (!ab) setWerteFehler(e instanceof Error ? e.message : "Werte nicht verfügbar.");
      });
    return () => {
      ab = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ergebnis, szenario]);

  const b = useMemo(() => (datei ? bausteineAus(datei) : null), [datei]);
  const alts = useMemo(() => (datei ? altsAus(datei) : []), [datei]);
  const orte = useMemo(() => meldungenJeOrt(meldungen), [meldungen]);

  if (!datei || !b) return null;

  const text = (k: string) => katalog?.bausteine?.[k]?.bezeichnung ?? k;
  const einheit = (k: string) => katalog?.bausteine?.[k]?.einheit ?? "";
  const zeilen: Zeile[] = [
    { ziel: "frist", text: text("frist"), formel: b.frist, einheit: einheit("frist") },
    ...alts
      .filter((a) => a.art !== "ausscheiden")
      .map((a) => ({
        ziel: `lieferzeit:${a.schluessel}`,
        text: `Lieferzeit ${a.name}`,
        formel: b.lieferzeit[a.schluessel] ?? "",
        einheit: einheit("lieferzeit"),
      })),
    ...BAUSTEIN_FORMELN.filter((k) => k !== "frist").map((k) => ({
      ziel: k,
      text: text(k),
      formel: b[k],
      einheit: einheit(k),
    })),
  ];
  const rueckfallOptionen = alts.filter((a) => a.art === "neuteil" || a.art === "sonstige");
  const rueckfall = rueckfallOptionen.some((a) => a.schluessel === b.rueckfall) ? b.rueckfall : KEIN_RUECKFALL;

  function formelSetzen(ziel: string, formel: string) {
    if (ziel.startsWith("lieferzeit:")) {
      const alt = ziel.slice("lieferzeit:".length);
      aendereDatei((d) => setzeLieferzeit(d, alt, formel));
    } else {
      aendereDatei((d) => setzeBausteine(d, { [ziel]: formel }));
    }
  }

  return (
    <>
      <SeitenKopf
        titel="Faktorbausteine"
        abschnitt="Abschnitt 4.5.3"
        text="Verzug und Ausschussrisiko sind Teil der Methode und immer vorhanden. Jeder Baustein ist eine Formel, meist nur der Name eines Felds aus dem Datenblatt. Einflussfaktoren ändern diese Felder, zum Beispiel die Lieferzeiten. Im Referenzfall sind alle Bausteine neutral gesetzt."
      />

      <section aria-labelledby="bausteine-titel" className="mb-8 rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id="bausteine-titel" className="text-base font-medium">
            Verzug und Ausschussrisiko
          </h2>
          <p className="text-xs text-muted-foreground" data-testid="bausteine-szenario">
            Werte im Szenario{" "}
            <span className="font-medium text-foreground">{szenarioTitel(szenario, datei)}</span>
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Baustein</TableHead>
              <TableHead className="w-[26%]">Formel</TableHead>
              <TableHead>Einheit</TableHead>
              <TableHead className="text-right">Wert im Szenario</TableHead>
              <TableHead>Prüfung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.map((z) => {
              const ort = bausteinOrt(z.ziel);
              return (
                <TableRow key={z.ziel} data-ort={ort}>
                  <TableCell className="whitespace-normal">{z.text}</TableCell>
                  <TableCell>
                    <Input
                      value={z.formel}
                      readOnly={schreibgeschuetzt}
                      aria-label={`Formel ${z.text}`}
                      placeholder={z.ziel === "strafe_max" ? "leer = keine Obergrenze" : "0"}
                      className="h-8 font-mono text-[13px]"
                      onChange={(e) => formelSetzen(z.ziel, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{z.einheit}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums" data-testid={`baustein-wert-${z.ziel}`}>
                    {werteFehler ? LEER : wertText(werte?.werte[z.ziel], z.ziel, z.einheit)}
                  </TableCell>
                  <TableCell className="max-w-[28ch] truncate text-xs">
                    <ZeilenMeldung meldungen={orte[ort] ?? []} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="grid gap-4 border-t border-border px-4 py-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rueckfall" className="text-sm font-medium">
              Rückfall bei Ausschuss
            </label>
            <Select
              value={rueckfall}
              disabled={schreibgeschuetzt}
              onValueChange={(v) =>
                aendereDatei((d) => setzeBausteine(d, { rueckfall: v === KEIN_RUECKFALL ? "" : String(v) }))
              }
            >
              <SelectTrigger id="rueckfall" className="w-full max-w-[320px]">
                <SelectValue>
                  {rueckfall === KEIN_RUECKFALL
                    ? "kein Rückfall"
                    : (alts.find((a) => a.schluessel === rueckfall)?.name ?? rueckfall)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEIN_RUECKFALL}>kein Rückfall</SelectItem>
                {rueckfallOptionen.map((a) => (
                  <SelectItem key={a.schluessel} value={a.schluessel}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Scheitert die Wiederaufbereitung mit dem Ausschussrisiko, wird diese Alternative beschafft
              (Formeln 12 und 13).
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <Switch
                id="harte-frist"
                checked={b.harte_frist}
                disabled={schreibgeschuetzt}
                onCheckedChange={(v) => aendereDatei((d) => setzeBausteine(d, { harte_frist: Boolean(v) }))}
              />
              <label htmlFor="harte-frist" className="text-sm font-medium">
                Frist als Ausschlusskriterium (harte Frist)
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Alternativen mit Lieferzeit über der Frist scheiden aus. Hält keine die Frist, wird sie als
              weiche Frist behandelt (Pinedo 2016, S. 453).
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="formeln-titel">
        <h2 id="formeln-titel" className="mb-1 text-lg font-medium">
          Formeln (11) bis (13)
        </h2>
        <p className="mb-4 max-w-[72ch] text-sm text-muted-foreground blocksatz">
          Wortlaut aus Abschnitt 4.5.3. Die eingesetzten Werte je Alternative zeigt der Rechenweg auf der
          Seite Ergebnis, sobald ein Baustein wirkt.
        </p>
        <div className="grid gap-4 xl:grid-cols-1">
          {formeln.map((f) => (
            <FormelKarte
              key={f.nummer}
              formel={{
                titel: f.titel,
                nummer: f.nummer,
                abschnitt: f.abschnitt,
                allgemein: f.latex,
                eingesetzt: "",
                ergebnis: "",
                erklaerung: f.hinweis,
                zeichen: f.zeichen,
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}
