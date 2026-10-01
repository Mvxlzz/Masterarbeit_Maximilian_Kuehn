"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { holeKatalog } from "@/lib/api";
import {
  abgeleiteteStufen,
  benenneSchadensgrad,
  benenneSchadenstyp,
  eignung as eignungAus,
  fallBeschreibung,
  fallName,
  loescheEignungZeile,
  loescheSchadensgradZeile,
  neueEignungZeile,
  neueSchadensgradZeile,
  schadensgradScore,
  setzeEignungZeile,
  setzeFallKopf,
  setzeSchadensgradZeile,
  setzeStammdaten,
  stammdaten as stammAus,
  werkstoffklassen,
} from "@/lib/fall";

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

export default function FallBauteilPage() {
  const { datei, ergebnis, aktuell, schreibgeschuetzt, aendereDatei } = useFall();
  const [rasterWerkstoff, setRasterWerkstoff] = useState<Record<string, string>>({});

  useEffect(() => {
    let abbruch = false;
    holeKatalog()
      .then((k) => {
        if (!abbruch) setRasterWerkstoff(k.raster.werkstoff ?? {});
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      abbruch = true;
    };
  }, []);

  const stamm = useMemo(() => (datei ? stammAus(datei) : null), [datei]);
  const klassen = useMemo(() => (datei ? werkstoffklassen(datei) : []), [datei]);
  const eignung = useMemo(() => (datei ? eignungAus(datei) : {}), [datei]);
  const score = useMemo(() => (datei ? schadensgradScore(datei) : {}), [datei]);
  const abgeleitet = useMemo(
    () => (datei && aktuell ? abgeleiteteStufen(datei, ergebnis) : {}),
    [datei, ergebnis, aktuell]
  );

  if (!datei || !stamm) return null;

  const name = fallName(datei);
  const beschreibung = fallBeschreibung(datei);
  const schadenstypen = Object.keys(eignung);
  const grade = Object.keys(score);

  const hinweisTeile: string[] = [];
  if (abgeleitet.werkstoffeignung != null) {
    const s = abgeleitet.werkstoffeignung;
    const text = rasterWerkstoff[String(s)];
    hinweisTeile.push(
      text
        ? `Werkstoffeignung Stufe ${s} (${text})`
        : `Werkstoffeignung Stufe ${s}`
    );
  }
  if (abgeleitet.schadensgrad != null) {
    hinweisTeile.push(
      `Beherrschbarkeit des Schadensgrads Stufe ${abgeleitet.schadensgrad}`
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="mb-1.5 text-2xl font-medium tracking-tight">
          Bauteil und Schaden
        </h1>
        <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
          Abschnitte 4.2.1 bis 4.2.4, Tabellen 3, 5 und 6
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="fall-name">Name des Falls</Label>
          <Input
            id="fall-name"
            aria-label="Name des Falls"
            defaultValue={name}
            key={`name-${name}`}
            disabled={schreibgeschuetzt}
            maxLength={200}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== name) aendereDatei((d) => setzeFallKopf(d, { name: v }));
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fall-beschreibung">Beschreibung</Label>
          <Input
            id="fall-beschreibung"
            aria-label="Beschreibung"
            defaultValue={beschreibung}
            key={`beschr-${beschreibung}`}
            disabled={schreibgeschuetzt}
            maxLength={2000}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== beschreibung) {
                aendereDatei((d) => setzeFallKopf(d, { beschreibung: v }));
              }
            }}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="stamm-bauteil">Bezeichnung des Bauteils</Label>
            <Input
              id="stamm-bauteil"
              aria-label="Bezeichnung des Bauteils"
              defaultValue={stamm.bauteil}
              key={`bauteil-${stamm.bauteil}`}
              disabled={schreibgeschuetzt}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== stamm.bauteil) {
                  aendereDatei((d) => setzeStammdaten(d, { bauteil: v }));
                }
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stamm-werkstoff">Werkstoff</Label>
            <Input
              id="stamm-werkstoff"
              aria-label="Werkstoff"
              defaultValue={stamm.werkstoff}
              key={`werkstoff-${stamm.werkstoff}`}
              disabled={schreibgeschuetzt}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== stamm.werkstoff) {
                  aendereDatei((d) => setzeStammdaten(d, { werkstoff: v }));
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Werkstoffbezeichnung, z. B. 42CrMo4. Nur zur Beschreibung.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stamm-klasse">Werkstoffklasse</Label>
            <Select
              value={stamm.werkstoffklasse}
              disabled={schreibgeschuetzt}
              onValueChange={(v) => {
                if (v) aendereDatei((d) => setzeStammdaten(d, { werkstoffklasse: v }));
              }}
            >
              <SelectTrigger id="stamm-klasse" aria-label="Werkstoffklasse" className="w-full">
                <SelectValue>{stamm.werkstoffklasse}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {klassen.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Bestimmt mit dem Schadenstyp die Werkstoffeignung (Tabelle 5).
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="stamm-schadenstyp">Schadenstyp</Label>
            <Select
              value={stamm.schadenstyp}
              disabled={schreibgeschuetzt}
              onValueChange={(v) => {
                if (v) aendereDatei((d) => setzeStammdaten(d, { schadenstyp: v }));
              }}
            >
              <SelectTrigger id="stamm-schadenstyp" aria-label="Schadenstyp" className="w-full">
                <SelectValue>{stamm.schadenstyp}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {schadenstypen.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Bestimmt die benötigte Verfahrensklasse und die Zeile in Tabelle 5.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stamm-schadensgrad">Schadensgrad</Label>
            <Select
              value={stamm.schadensgrad}
              disabled={schreibgeschuetzt}
              onValueChange={(v) => {
                if (v) aendereDatei((d) => setzeStammdaten(d, { schadensgrad: v }));
              }}
            >
              <SelectTrigger
                id="stamm-schadensgrad"
                aria-label="Schadensgrad"
                className="w-full"
              >
                <SelectValue>{stamm.schadensgrad}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {grade.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Überführung in die Bewertungsstufe nach Tabelle 3.
            </p>
          </div>
        </div>
      </section>

      {hinweisTeile.length > 0 && (
        <p className="text-sm" data-testid="abgeleitete-stufen">
          <span className="font-medium">Abgeleitete Stufen im aktuellen Fall: </span>
          {hinweisTeile.join(", ")}.
        </p>
      )}
      {!aktuell && (
        <p className="text-sm text-muted-foreground">
          Die abgeleiteten Stufen erscheinen, sobald das Modell keine Fehler mehr enthält.
        </p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">
              Werkstoffeignung je Schadenstyp und Werkstoffklasse (Tabelle 5)
            </h2>
            <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground blocksatz">
              Ein Betrieb kann die Tabelle an seine Verfahren anpassen, ohne den
              Bewertungsalgorithmus zu ändern (Zusage aus 4.2.3). Stufe 1 schließt einen
              Wiederaufbereitungsweg aus.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={schreibgeschuetzt}
            onClick={() => {
              let i = 1;
              let nameNeu = `Neuer Schadenstyp ${i}`;
              while (schadenstypen.includes(nameNeu)) {
                i += 1;
                nameNeu = `Neuer Schadenstyp ${i}`;
              }
              aendereDatei((d) => neueEignungZeile(d, nameNeu));
            }}
          >
            <Plus className="size-4" />
            Zeile hinzufügen
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table aria-label="Werkstoffeignung Tabelle 5">
            <TableHeader>
              <TableRow>
                <TableHead>Schadenstyp</TableHead>
                {klassen.map((k) => (
                  <TableHead key={k} className="text-right">
                    {k}
                  </TableHead>
                ))}
                <TableHead className="w-10">
                  <span className="sr-only">Löschen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schadenstypen.map((typ) => {
                const werte = eignung[typ] ?? klassen.map(() => 3);
                const aktiv = stamm.schadenstyp === typ;
                return (
                  <TableRow key={typ} data-schadenstyp={typ}>
                    <TableCell>
                      <Input
                        aria-label={`Schadenstyp ${typ}`}
                        defaultValue={typ}
                        key={`typ-${typ}`}
                        disabled={schreibgeschuetzt}
                        className="h-8 min-w-[10rem]"
                        onBlur={(e) => {
                          const neu = e.target.value.trim();
                          if (neu && neu !== typ) {
                            aendereDatei((d) => benenneSchadenstyp(d, typ, neu));
                          }
                        }}
                      />
                    </TableCell>
                    {klassen.map((k, ki) => (
                      <TableCell key={k} className="text-right">
                        <StufeZelle
                          value={werte[ki] ?? 3}
                          disabled={schreibgeschuetzt}
                          ariaLabel={`Stufe ${typ} ${k}`}
                          onCommit={(n) => {
                            const neu = [...werte];
                            while (neu.length < klassen.length) neu.push(3);
                            neu[ki] = n;
                            aendereDatei((d) => setzeEignungZeile(d, typ, neu));
                          }}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={schreibgeschuetzt || aktiv}
                        aria-label={`Schadenstyp ${typ} löschen`}
                        title={
                          aktiv
                            ? "Der Schadenstyp des Falls muss in der Tabelle bleiben."
                            : "Zeile löschen"
                        }
                        onClick={() => aendereDatei((d) => loescheEignungZeile(d, typ))}
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
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-medium tracking-tight">
            Schadensgrad und Bewertungsstufe (Tabelle 3)
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={schreibgeschuetzt}
            onClick={() => {
              let i = 1;
              let nameNeu = `neu ${i}`;
              while (grade.includes(nameNeu)) {
                i += 1;
                nameNeu = `neu ${i}`;
              }
              aendereDatei((d) => neueSchadensgradZeile(d, nameNeu, 3));
            }}
          >
            <Plus className="size-4" />
            Zeile hinzufügen
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table aria-label="Schadensgrad Tabelle 3">
            <TableHeader>
              <TableRow>
                <TableHead>Schadensgrad</TableHead>
                <TableHead className="text-right">Stufe</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Löschen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grade.map((g) => {
                const aktiv = stamm.schadensgrad === g;
                return (
                  <TableRow key={g} data-schadensgrad={g}>
                    <TableCell>
                      <Input
                        aria-label={`Schadensgrad ${g}`}
                        defaultValue={g}
                        key={`grad-${g}`}
                        disabled={schreibgeschuetzt}
                        className="h-8 min-w-[10rem]"
                        onBlur={(e) => {
                          const neu = e.target.value.trim();
                          if (neu && neu !== g) {
                            aendereDatei((d) => benenneSchadensgrad(d, g, neu));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <StufeZelle
                        value={score[g] ?? 3}
                        disabled={schreibgeschuetzt}
                        ariaLabel={`Stufe Schadensgrad ${g}`}
                        onCommit={(n) =>
                          aendereDatei((d) => setzeSchadensgradZeile(d, g, n))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={schreibgeschuetzt || aktiv}
                        aria-label={`Schadensgrad ${g} löschen`}
                        title={
                          aktiv
                            ? "Der Schadensgrad des Falls muss in der Tabelle bleiben."
                            : "Zeile löschen"
                        }
                        onClick={() =>
                          aendereDatei((d) => loescheSchadensgradZeile(d, g))
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
      </section>
    </div>
  );
}
