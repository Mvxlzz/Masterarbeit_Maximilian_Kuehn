"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
  ApiFehler,
  alternativenSetzen,
  holeKatalog,
  type AlternativeEintrag,
} from "@/lib/api";
import { alternativen as altsAus } from "@/lib/fall";

type Zeile = AlternativeEintrag & { _id: string; _altSchluessel: string | null };

let zeilenZaehler = 0;
function neueId(): string {
  zeilenZaehler += 1;
  return `z${zeilenZaehler}`;
}

function ausDatei(datei: Parameters<typeof altsAus>[0]): Zeile[] {
  return altsAus(datei).map((a) => ({
    _id: neueId(),
    _altSchluessel: a.schluessel,
    schluessel: a.schluessel,
    name: a.name,
    art: a.art,
    aktiv: a.aktiv,
  }));
}

export default function FallAlternativenPage() {
  const { datei, schreibgeschuetzt, setzeDateiDirekt } = useFall();
  const [arten, setArten] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  useEffect(() => {
    let abbruch = false;
    holeKatalog()
      .then((k) => {
        if (!abbruch) setArten(k.arten ?? {});
      })
      .catch(() => {
        if (!abbruch) {
          setArten({
            aufbereitung: "Wiederaufbereitung",
            neuteil: "Neuteilersatz",
            ausscheiden: "Ausscheiden",
            sonstige: "Sonstige Alternative",
          });
        }
      });
    return () => {
      abbruch = true;
    };
  }, []);

  const signatur = useMemo(() => {
    if (!datei) return "";
    return altsAus(datei)
      .map((a) => `${a.schluessel}|${a.name}|${a.art}|${a.aktiv}`)
      .join(";");
  }, [datei]);

  const basisZeilen = useMemo(
    () => (datei ? ausDatei(datei) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei Signaturwechsel neu ableiten
    [signatur]
  );

  const [draft, setDraft] = useState<{ sig: string; zeilen: Zeile[] } | null>(null);
  const zeilen = draft?.sig === signatur ? draft.zeilen : basisZeilen;

  const setzeZeilen = useCallback(
    (neu: Zeile[]) => {
      setDraft({ sig: signatur, zeilen: neu });
    },
    [signatur]
  );

  const speichern = useCallback(
    async (neu: Zeile[]) => {
      if (!datei || schreibgeschuetzt) return;
      setLaedt(true);
      setFehler(null);
      const zuordnung: Record<string, string | null> = {};
      const alte = altsAus(datei);
      const behalten = new Set(neu.map((z) => z.schluessel));
      for (const a of alte) {
        const z = neu.find((x) => x._altSchluessel === a.schluessel);
        if (!z) {
          zuordnung[a.schluessel] = null;
        } else if (z.schluessel !== a.schluessel) {
          zuordnung[a.schluessel] = z.schluessel;
        }
      }
      for (const a of alte) {
        if (!behalten.has(a.schluessel) && !(a.schluessel in zuordnung)) {
          zuordnung[a.schluessel] = null;
        }
      }
      try {
        const antwort = await alternativenSetzen(
          datei,
          neu.map(({ schluessel, name, art, aktiv }) => ({
            schluessel,
            name,
            art,
            aktiv,
          })),
          zuordnung
        );
        setDraft(null);
        setzeDateiDirekt(antwort.datei);
      } catch (e) {
        setFehler(
          e instanceof ApiFehler
            ? e.message
            : "Die Alternativen konnten nicht gespeichert werden."
        );
      } finally {
        setLaedt(false);
      }
    },
    [datei, schreibgeschuetzt, setzeDateiDirekt]
  );

  if (!datei) return null;

  const artOptionen = Object.entries(arten);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Alternativen</h1>
        <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
          Abschnitt 4.1.2. Die Art steuert die Methode: Wiederaufbereitung durchläuft Gate,
          Unterkriterien und Ausschussrisiko. Neuteilersatz hängt an Ersatzbedarf und
          Verfügbarkeit und erhält den technischen Höchstwert. Ausscheiden entfällt bei
          Ersatzbedarf. Sonstige Alternativen werden über Unterkriterien bewertet. Eine neue
          Alternative braucht Positionen unter „Formeln“.
        </p>
      </header>

      {fehler && (
        <p role="alert" className="text-sm text-destructive">
          {fehler}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={schreibgeschuetzt || laedt}
          onClick={() => {
            let i = 1;
            let s = `alt_${i}`;
            while (zeilen.some((z) => z.schluessel === s)) {
              i += 1;
              s = `alt_${i}`;
            }
            const neu: Zeile[] = [
              ...zeilen,
              {
                _id: neueId(),
                _altSchluessel: null,
                schluessel: s,
                name: `Neue Alternative ${i}`,
                art: "sonstige",
                aktiv: true,
              },
            ];
            setzeZeilen(neu);
            void speichern(neu);
          }}
        >
          <Plus className="size-4" />
          Alternative hinzufügen
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table aria-label="Alternativen">
          <TableHeader>
            <TableRow>
              <TableHead>Schlüssel</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Art</TableHead>
              <TableHead>aktiv</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Löschen</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.map((z, idx) => (
              <TableRow key={z._id} data-schluessel={z.schluessel}>
                <TableCell>
                  <Input
                    aria-label={`Schlüssel Alternative ${idx + 1}`}
                    defaultValue={z.schluessel}
                    key={`s-${z._id}-${z.schluessel}`}
                    disabled={schreibgeschuetzt || laedt}
                    className="h-8 font-mono"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v || v === z.schluessel) return;
                      const neu = zeilen.map((x) =>
                        x._id === z._id ? { ...x, schluessel: v } : x
                      );
                      setzeZeilen(neu);
                      void speichern(neu);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={`Name Alternative ${idx + 1}`}
                    defaultValue={z.name}
                    key={`n-${z._id}-${z.name}`}
                    disabled={schreibgeschuetzt || laedt}
                    className="h-8 min-w-[12rem]"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v || v === z.name) return;
                      const neu = zeilen.map((x) =>
                        x._id === z._id ? { ...x, name: v } : x
                      );
                      setzeZeilen(neu);
                      void speichern(neu);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={z.art}
                    disabled={schreibgeschuetzt || laedt}
                    onValueChange={(v) => {
                      if (!v) return;
                      const neu = zeilen.map((x) =>
                        x._id === z._id ? { ...x, art: v } : x
                      );
                      setzeZeilen(neu);
                      void speichern(neu);
                    }}
                  >
                    <SelectTrigger
                      aria-label={`Art Alternative ${idx + 1}`}
                      className="h-8 w-48"
                    >
                      <SelectValue>{arten[z.art] ?? z.art}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {artOptionen.map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={z.aktiv}
                    disabled={schreibgeschuetzt || laedt}
                    aria-label={`Aktiv Alternative ${idx + 1}`}
                    onCheckedChange={(c) => {
                      const neu = zeilen.map((x) =>
                        x._id === z._id ? { ...x, aktiv: Boolean(c) } : x
                      );
                      setzeZeilen(neu);
                      void speichern(neu);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={schreibgeschuetzt || laedt || zeilen.length <= 1}
                    aria-label={`Alternative ${z.name} löschen`}
                    onClick={() => {
                      const neu = zeilen.filter((x) => x._id !== z._id);
                      setzeZeilen(neu);
                      void speichern(neu);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
