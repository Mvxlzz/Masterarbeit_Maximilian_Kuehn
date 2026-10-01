"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2, XCircle } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { holeKatalog } from "@/lib/api";
import { gewicht, LEER, zahl } from "@/lib/format";
import {
  loescheUnterkriterium,
  neuesUnterkriterium,
  setzeKonvention,
  setzeStufe,
  setzeUnterkriterium,
  sTechOhneVerfahren,
  technikAlternativen,
  unterkriterien as ukAus,
} from "@/lib/fall";
import { cn } from "@/lib/utils";

const EINGEGEBEN = "eingegeben";
const EINGEGEBEN_KEY = "__eingegeben__";

function StufeZelle({
  value,
  disabled,
  ariaLabel,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  ariaLabel: string;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  return (
    <Input
      value={text}
      disabled={disabled}
      aria-label={ariaLabel}
      className="h-8 w-14 font-mono text-right"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number.parseInt(text.trim(), 10);
        if (!Number.isFinite(n) || n < 1 || n > 5) {
          setText(String(value));
          return;
        }
        if (n !== value) onCommit(n);
        setText(String(n));
      }}
    />
  );
}

export default function FallTechnikPage() {
  const { datei, ergebnis, aktuell, schreibgeschuetzt, aendereDatei } = useFall();
  const [ableitungen, setAbleitungen] = useState<Record<string, string>>({});
  const [raster, setRaster] = useState<Record<string, Record<string, string>>>({});
  const [rasterTitel, setRasterTitel] = useState<Record<string, string>>({});
  const [rasterOffen, setRasterOffen] = useState(false);

  useEffect(() => {
    let abbruch = false;
    holeKatalog()
      .then((k) => {
        if (abbruch) return;
        setAbleitungen(k.ableitungen ?? {});
        setRaster(k.raster ?? {});
        setRasterTitel(k.raster_titel ?? {});
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      abbruch = true;
    };
  }, []);

  const uks = useMemo(() => (datei ? ukAus(datei) : []), [datei]);
  const techAlts = useMemo(() => (datei ? technikAlternativen(datei) : []), [datei]);
  const konvention = datei ? sTechOhneVerfahren(datei) === 5.0 : true;

  if (!datei) return null;

  const ableitungOptionen: [string, string][] = [
    [EINGEGEBEN_KEY, EINGEGEBEN],
    ...Object.entries(ableitungen),
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Technik</h1>
        <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
          Abschnitt 4.3.1, Tabellen 8 und 9, Formeln (5) und (6). Unterkriterien je Alternative
          mit technischer Bewertung, Stufe 5 (höchste) bis 1. Stufe 1 schließt die Alternative
          aus. Bei abgeleiteten Kriterien bestimmt der Kern die Stufe aus Tabelle 3 oder 5, die
          Zellen bleiben leer. Die Gewichte stehen unter „Gewichte“.
        </p>
      </header>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={schreibgeschuetzt}
          onClick={() => {
            let i = 1;
            let s = `uk_${i}`;
            while (uks.some((u) => u.schluessel === s)) {
              i += 1;
              s = `uk_${i}`;
            }
            const stufen: Record<string, number> = {};
            for (const a of techAlts) stufen[a.schluessel] = 3;
            aendereDatei((d) =>
              neuesUnterkriterium(d, {
                schluessel: s,
                name: `Neues Unterkriterium ${i}`,
                gewicht: 0,
                stufen,
                ableitung: null,
              })
            );
          }}
        >
          <Plus className="size-4" />
          Unterkriterium hinzufügen
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Neue Unterkriterien erhalten Gewicht 0. Die Gewichte stellen Sie unter „Gewichte“ ein.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table aria-label="Technische Unterkriterien">
          <TableHeader>
            <TableRow>
              <TableHead>Schlüssel</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Ableitung</TableHead>
              {techAlts.map((a) => (
                <TableHead key={a.schluessel} className="text-right">
                  {a.name}
                </TableHead>
              ))}
              <TableHead className="w-10">
                <span className="sr-only">Löschen</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uks.map((u) => {
              const abKey = u.ableitung ?? EINGEGEBEN_KEY;
              const abLabel = u.ableitung
                ? (ableitungen[u.ableitung] ?? u.ableitung)
                : EINGEGEBEN;
              return (
                <TableRow key={u.schluessel} data-uk={u.schluessel}>
                  <TableCell>
                    <Input
                      aria-label={`Schlüssel Unterkriterium ${u.schluessel}`}
                      defaultValue={u.schluessel}
                      key={`uks-${u.schluessel}`}
                      disabled={schreibgeschuetzt}
                      className="h-8 font-mono"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== u.schluessel) {
                          aendereDatei((d) =>
                            setzeUnterkriterium(d, u.schluessel, { schluessel: v })
                          );
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Name Unterkriterium ${u.schluessel}`}
                      defaultValue={u.name}
                      key={`ukn-${u.schluessel}-${u.name}`}
                      disabled={schreibgeschuetzt}
                      className="h-8 min-w-[10rem]"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== u.name) {
                          aendereDatei((d) =>
                            setzeUnterkriterium(d, u.schluessel, { name: v })
                          );
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={abKey}
                      disabled={schreibgeschuetzt}
                      onValueChange={(v) => {
                        if (!v) return;
                        const ableitung = v === EINGEGEBEN_KEY ? null : v;
                        const stufen: Record<string, number> = {};
                        if (!ableitung) {
                          for (const a of techAlts) {
                            stufen[a.schluessel] = u.stufen[a.schluessel] ?? 3;
                          }
                        }
                        aendereDatei((d) =>
                          setzeUnterkriterium(d, u.schluessel, { ableitung, stufen })
                        );
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Ableitung ${u.schluessel}`}
                        className="h-8 w-56"
                      >
                        <SelectValue>{abLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ableitungOptionen.map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {techAlts.map((a) => (
                    <TableCell key={a.schluessel} className="text-right">
                      {u.ableitung ? (
                        <span className="text-muted-foreground">{LEER}</span>
                      ) : (
                        <StufeZelle
                          value={u.stufen[a.schluessel] ?? 3}
                          disabled={schreibgeschuetzt}
                          ariaLabel={`Stufe ${u.name} ${a.name}`}
                          onCommit={(n) =>
                            aendereDatei((d) =>
                              setzeStufe(d, u.schluessel, a.schluessel, n)
                            )
                          }
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={schreibgeschuetzt || uks.length <= 1}
                      aria-label={`Unterkriterium ${u.name} löschen`}
                      onClick={() =>
                        aendereDatei((d) => loescheUnterkriterium(d, u.schluessel))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start gap-3">
        <Switch
          id="technik-konvention"
          checked={konvention}
          disabled={schreibgeschuetzt}
          aria-label="Neuteil und Ausscheiden erhalten den Höchstwert"
          onCheckedChange={(c) => aendereDatei((d) => setzeKonvention(d, Boolean(c)))}
        />
        <div className="grid gap-0.5">
          <Label htmlFor="technik-konvention" className="font-normal leading-snug">
            Neuteil und Ausscheiden erhalten den Höchstwert (Konvention aus 4.3.1)
          </Label>
          <p className="text-xs text-muted-foreground">
            Ausgeschaltet erhalten sie die unterste Stufe s = 1. So prüft Abschnitt 4.5.4 die
            Konvention (Szenario S10).
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">
          Wirksame Stufen und technischer Dimensionswert
        </h2>
        {!aktuell || !ergebnis ? (
          <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
            Die wirksamen Stufen erscheinen, sobald das Modell keine Fehler mehr enthält.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table aria-label="Wirksame Stufen">
                <TableHeader>
                  <TableRow>
                    <TableHead>Größe</TableHead>
                    {Object.keys(ergebnis.s_tech).map((s) => {
                      const alt = technikAlternativen(datei).find((a) => a.schluessel === s)
                        ?? { name: s, schluessel: s };
                      // Anzeigenamen aus Alternativenliste (alle)
                      const name =
                        (
                          datei.modell as {
                            alternativen?: { schluessel: string; name: string }[];
                          }
                        ).alternativen?.find((a) => a.schluessel === s)?.name ?? alt.name;
                      return (
                        <TableHead key={s} className="text-right" data-alt={s}>
                          {name}
                        </TableHead>
                      );
                    })}
                    {/* Technik-Alternativen ausgeschlossen ohne s_tech */}
                    {techAlts
                      .filter((a) => !(a.schluessel in ergebnis.s_tech))
                      .map((a) => (
                        <TableHead key={a.schluessel} className="text-right" data-alt={a.schluessel}>
                          {a.name}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uks.map((u) => (
                    <TableRow key={u.schluessel}>
                      <TableCell>
                        {u.name} (Gewicht {gewicht(u.gewicht)})
                      </TableCell>
                      {Object.keys(ergebnis.s_tech).map((s) => {
                        const stufen = ergebnis.unterkriterien[s];
                        const wert = stufen?.[u.schluessel];
                        return (
                          <TableCell key={s} className="text-right font-mono">
                            {wert != null ? String(wert) : LEER}
                          </TableCell>
                        );
                      })}
                      {techAlts
                        .filter((a) => !(a.schluessel in ergebnis.s_tech))
                        .map((a) => (
                          <TableCell key={a.schluessel} className="text-right text-muted-foreground">
                            {LEER}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>Technischer Dimensionswert (Skala 1 bis 5)</TableCell>
                    {Object.keys(ergebnis.s_tech).map((s) => (
                      <TableCell key={s} className="text-right font-mono">
                        {zahl(ergebnis.s_tech[s])}
                      </TableCell>
                    ))}
                    {techAlts
                      .filter((a) => !(a.schluessel in ergebnis.s_tech))
                      .map((a) => (
                        <TableCell key={a.schluessel} className="text-right text-muted-foreground">
                          ausgeschlossen
                        </TableCell>
                      ))}
                  </TableRow>
                  <TableRow>
                    <TableCell>Punkte technisch (0 bis 100)</TableCell>
                    {Object.keys(ergebnis.s_tech).map((s) => (
                      <TableCell key={s} className="text-right font-mono">
                        {zahl(ergebnis.n_tech[s])}
                      </TableCell>
                    ))}
                    {techAlts
                      .filter((a) => !(a.schluessel in ergebnis.s_tech))
                      .map((a) => (
                        <TableCell key={a.schluessel} className="text-right text-muted-foreground">
                          {LEER}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {Object.entries(ergebnis.ausgeschlossen)
                .filter(
                  ([s, grund]) =>
                    techAlts.some((a) => a.schluessel === s) &&
                    grund.toLowerCase().includes("technisch")
                )
                .map(([s, grund]) => {
                  const name =
                    techAlts.find((a) => a.schluessel === s)?.name ?? s;
                  return (
                    <li
                      key={s}
                      data-testid={`technik-ausschluss-${s}`}
                      className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm"
                    >
                      <XCircle
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                        aria-hidden
                      />
                      <div>
                        <p className="font-medium line-through text-muted-foreground">
                          {name}
                        </p>
                        <p className="text-xs text-muted-foreground">{grund}</p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </section>

      <section>
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium"
          aria-expanded={rasterOffen}
          onClick={() => setRasterOffen((o) => !o)}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", rasterOffen && "rotate-180")}
          />
          Bewertungsraster (Tabelle 8)
        </button>
        {rasterOffen && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <Table aria-label="Bewertungsraster Tabelle 8">
              <TableHeader>
                <TableRow>
                  <TableHead>Stufe</TableHead>
                  {Object.keys(raster).map((k) => (
                    <TableHead key={k}>{rasterTitel[k] ?? k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[5, 4, 3, 2, 1].map((s) => (
                  <TableRow key={s}>
                    <TableCell className="font-mono">{s}</TableCell>
                    {Object.keys(raster).map((k) => (
                      <TableCell key={k} className="text-sm">
                        {raster[k]?.[String(s)] ?? LEER}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
