"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, HelpCircle } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { Katex } from "@/components/katex";
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
import { ApiFehler, holeLatex } from "@/lib/api";
import { mitEinheit, rechenwert } from "@/lib/format";
import {
  DIMENSION_TEXT,
  alternativen as altsAus,
  einheitDimension,
  ergebnisseAusRechenweg,
  felder as felderAus,
  hilfsgroessen as hilfsAus,
  loescheHilfsgroesse,
  loeschePosition,
  meldungenJeOrt,
  neueHilfsgroesse,
  neuePosition,
  positionsErgebnisKey,
  positionen as posAus,
  setzeHilfsgroesse,
  setzePosition,
  type Position,
} from "@/lib/fall";
import { cn } from "@/lib/utils";

const HILFE_TEXT =
  "Erlaubt sind Zahlen mit Dezimalpunkt, Namen von Feldern und Hilfsgrößen, + − * / **, Klammern, Vergleiche (< <= > >= == !=) und die Funktionen min, max, abs, aufrunden, abrunden, wenn(Bedingung, ja, nein). kosten(\"intern\") und co2(\"intern\") stehen für die Summe der Positionen einer Alternative ohne Einflussfaktoren. Nichts sonst – Formeln werden sicher über den Kern ausgewertet.";

function StatusText({ texte }: { texte: string[] }) {
  if (texte.length === 0) return <span className="text-muted-foreground">✓</span>;
  return (
    <span className="text-destructive" title={texte.join(" ")}>
      {texte[0]}
    </span>
  );
}

export default function FallFormelnPage() {
  const { datei, meldungen, ergebnis, aktuell, schreibgeschuetzt, aendereDatei } = useFall();
  const [fokusFormel, setFokusFormel] = useState<string>("");
  const [latexCache, setLatexCache] = useState<{
    formel: string;
    latex: string | null;
    fehler: string | null;
  } | null>(null);
  const [hilfeOffen, setHilfeOffen] = useState(false);
  const formelRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positionen = useMemo(() => (datei ? posAus(datei) : []), [datei]);
  const hilfen = useMemo(() => (datei ? hilfsAus(datei) : []), [datei]);
  const alts = useMemo(() => (datei ? altsAus(datei) : []), [datei]);
  const felder = useMemo(() => (datei ? felderAus(datei) : []), [datei]);
  const orte = useMemo(() => meldungenJeOrt(meldungen), [meldungen]);
  const erg = useMemo(
    () => ergebnisseAusRechenweg(ergebnis?.rechenweg ?? []),
    [ergebnis]
  );

  const latex =
    fokusFormel.trim() && latexCache?.formel === fokusFormel ? latexCache.latex : null;
  const latexFehler =
    fokusFormel.trim() && latexCache?.formel === fokusFormel ? latexCache.fehler : null;

  useEffect(() => {
    const formel = fokusFormel.trim();
    if (!formel) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      holeLatex(formel)
        .then((r) => {
          setLatexCache({ formel, latex: r.latex, fehler: null });
        })
        .catch((e) => {
          setLatexCache({
            formel,
            latex: null,
            fehler: e instanceof ApiFehler ? e.message : "Formel ungültig.",
          });
        });
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fokusFormel]);

  function nameEinfuegen(name: string) {
    const el = formelRef.current;
    if (!el || schreibgeschuetzt) {
      setFokusFormel((t) => t + name);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const neu = el.value.slice(0, start) + name + el.value.slice(end);
    // Formel gehört zur fokussierten Zeile – Eltern aktualisieren über data-attr
    const ziel = el.dataset.ziel;
    if (ziel?.startsWith("pos:")) {
      const i = Number(ziel.slice(4));
      aendereDatei((d) => setzePosition(d, i, { formel: neu }));
    } else if (ziel?.startsWith("hilf:")) {
      const i = Number(ziel.slice(5));
      aendereDatei((d) => setzeHilfsgroesse(d, i, { formel: neu }));
    }
    setFokusFormel(neu);
  }

  if (!datei) return null;

  return (
    <>
      <header className="mb-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Formeln</h1>
            <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
              Kosten- und CO₂-Positionen sowie Hilfsgrößen. Live-Ergebnis und Prüfung je Zeile.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHilfeOffen((o) => !o)}
            aria-expanded={hilfeOffen}
            aria-controls="formel-hilfe"
          >
            <HelpCircle className="size-3.5" aria-hidden />
            Hilfe zur Formelsprache
          </Button>
        </div>
        {hilfeOffen && (
          <div
            id="formel-hilfe"
            className="mb-4 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm"
          >
            <p className="mb-3">{HILFE_TEXT}</p>
            <p className="mb-2 font-medium">Namen im Fall (anklicken zum Einfügen):</p>
            <div className="flex flex-wrap gap-1.5">
              {felder.map((f) => (
                <button
                  key={`f-${f.name}`}
                  type="button"
                  className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs hover:bg-accent"
                  onClick={() => nameEinfuegen(f.name)}
                >
                  {f.name}
                </button>
              ))}
              {hilfen.map((h) => (
                <button
                  key={`h-${h.name}`}
                  type="button"
                  className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs hover:bg-accent"
                  onClick={() => nameEinfuegen(h.name)}
                >
                  {h.name}
                </button>
              ))}
              {alts.map((a) => (
                <span key={a.schluessel} className="contents">
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs hover:bg-accent"
                    onClick={() => nameEinfuegen(`kosten("${a.schluessel}")`)}
                  >
                    {`kosten("${a.schluessel}")`}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs hover:bg-accent"
                    onClick={() => nameEinfuegen(`co2("${a.schluessel}")`)}
                  >
                    {`co2("${a.schluessel}")`}
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      <section className="mb-8" aria-labelledby="pos-titel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="pos-titel" className="text-lg font-medium">
            Kosten- und CO₂-Positionen
          </h2>
          <Button
            type="button"
            size="sm"
            disabled={schreibgeschuetzt}
            onClick={() =>
              aendereDatei((d) =>
                neuePosition(d, {
                  dimension: "oekon",
                  bezeichnung: "Neue Position",
                  formel: "0",
                  alternativen: alts.filter((a) => a.aktiv).map((a) => a.schluessel),
                  gruppe: "",
                })
              )
            }
          >
            <Plus className="size-3.5" aria-hidden />
            Position
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table aria-label="Positionen">
            <TableHeader>
              <TableRow>
                <TableHead>Dimension</TableHead>
                <TableHead className="min-w-[18rem]">Bezeichnung</TableHead>
                <TableHead>Formel</TableHead>
                <TableHead>gilt für</TableHead>
                {alts.map((a) => (
                  <TableHead key={a.schluessel} className="text-right">
                    {a.name}
                  </TableHead>
                ))}
                <TableHead>Status</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Löschen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionen.map((p, i) => {
                const ort = `Position ${p.bezeichnung}`;
                const status = (orte[ort] ?? []).map(
                  (m) => `${m.stufe === "fehler" ? "Fehler" : "Warnung"}: ${m.text}`
                );
                const einheit = einheitDimension(p.dimension);
                return (
                  <TableRow key={i} data-ort={ort}>
                    <TableCell>
                      <Select
                        value={p.dimension}
                        disabled={schreibgeschuetzt}
                        onValueChange={(v) =>
                          v &&
                          aendereDatei((d) =>
                            setzePosition(d, i, { dimension: v as Position["dimension"] })
                          )
                        }
                      >
                        <SelectTrigger
                          className="min-w-[120px]"
                          aria-label={`Dimension Position ${i + 1}`}
                        >
                          <SelectValue>{DIMENSION_TEXT[p.dimension]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oekon">{DIMENSION_TEXT.oekon}</SelectItem>
                          <SelectItem value="oekol">{DIMENSION_TEXT.oekol}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[18rem] whitespace-normal">
                      <Input
                        value={p.bezeichnung}
                        disabled={schreibgeschuetzt}
                        aria-label={`Bezeichnung Position ${i + 1}`}
                        className="min-w-[16rem]"
                        title={p.bezeichnung}
                        onChange={(e) =>
                          aendereDatei((d) =>
                            setzePosition(d, i, { bezeichnung: e.target.value })
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={p.formel}
                        disabled={schreibgeschuetzt}
                        aria-label={`Formel Position ${i + 1}`}
                        className="min-w-[14rem] font-mono text-xs"
                        data-ziel={`pos:${i}`}
                        onFocus={(e) => {
                          formelRef.current = e.currentTarget;
                          setFokusFormel(p.formel);
                        }}
                        onChange={(e) => {
                          setFokusFormel(e.target.value);
                          aendereDatei((d) =>
                            setzePosition(d, i, { formel: e.target.value })
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {alts.map((a) => {
                          const checked = p.alternativen.includes(a.schluessel);
                          return (
                            <label
                              key={a.schluessel}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              <Checkbox
                                checked={checked}
                                disabled={schreibgeschuetzt}
                                aria-label={`${a.name} für Position ${i + 1}`}
                                onCheckedChange={(c) => {
                                  const an = c === true;
                                  const neu = an
                                    ? [...new Set([...p.alternativen, a.schluessel])]
                                    : p.alternativen.filter((s) => s !== a.schluessel);
                                  aendereDatei((d) =>
                                    setzePosition(d, i, { alternativen: neu })
                                  );
                                }}
                              />
                              {a.name}
                            </label>
                          );
                        })}
                      </div>
                    </TableCell>
                    {alts.map((a) => {
                      const key = positionsErgebnisKey(
                        p.bezeichnung,
                        p.formel,
                        a.schluessel,
                        einheit
                      );
                      const wert =
                        aktuell && p.alternativen.includes(a.schluessel)
                          ? erg.positionen.get(key)
                          : undefined;
                      return (
                        <TableCell key={a.schluessel} className="text-right font-mono text-xs">
                          {wert !== undefined ? mitEinheit(wert, einheit) : ""}
                        </TableCell>
                      );
                    })}
                    <TableCell className="max-w-[12rem] text-xs">
                      <StatusText texte={status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={schreibgeschuetzt}
                        aria-label={`Position ${i + 1} löschen`}
                        onClick={() => aendereDatei((d) => loeschePosition(d, i))}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!aktuell && (
          <p className="mt-2 text-sm text-muted-foreground">
            Ergebnisse je Zeile erscheinen, sobald das Modell keine Fehler mehr enthält.
          </p>
        )}
      </section>

      <section className="mb-8" aria-labelledby="hilf-titel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="hilf-titel" className="text-lg font-medium">
            Hilfsgrößen
          </h2>
          <Button
            type="button"
            size="sm"
            disabled={schreibgeschuetzt}
            onClick={() =>
              aendereDatei((d) =>
                neueHilfsgroesse(d, {
                  name: "neu",
                  bezeichnung: "Neue Hilfsgröße",
                  formel: "0",
                  einheit: "",
                  gruppe: "Eigene Hilfsgrößen",
                })
              )
            }
          >
            <Plus className="size-3.5" aria-hidden />
            Hilfsgröße
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table aria-label="Hilfsgrößen">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Formel</TableHead>
                <TableHead>Einheit</TableHead>
                <TableHead className="text-right">Ergebnis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Löschen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hilfen.map((h, i) => {
                const ort = `Hilfsgröße ${h.bezeichnung}`;
                const status = (orte[ort] ?? []).map(
                  (m) => `${m.stufe === "fehler" ? "Fehler" : "Warnung"}: ${m.text}`
                );
                const hilf = aktuell
                  ? erg.hilfsgroessen.get(`${h.bezeichnung}|${h.formel}`)
                  : undefined;
                return (
                  <TableRow key={i} data-ort={ort}>
                    <TableCell>
                      <Input
                        value={h.name}
                        disabled={schreibgeschuetzt}
                        aria-label={`Name Hilfsgröße ${i + 1}`}
                        className="font-mono text-xs"
                        onChange={(e) =>
                          aendereDatei((d) =>
                            setzeHilfsgroesse(d, i, { name: e.target.value })
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={h.bezeichnung}
                        disabled={schreibgeschuetzt}
                        aria-label={`Bezeichnung Hilfsgröße ${i + 1}`}
                        onChange={(e) =>
                          aendereDatei((d) =>
                            setzeHilfsgroesse(d, i, { bezeichnung: e.target.value })
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={h.formel}
                        disabled={schreibgeschuetzt}
                        aria-label={`Formel Hilfsgröße ${i + 1}`}
                        className="min-w-[14rem] font-mono text-xs"
                        data-ziel={`hilf:${i}`}
                        onFocus={(e) => {
                          formelRef.current = e.currentTarget;
                          setFokusFormel(h.formel);
                        }}
                        onChange={(e) => {
                          setFokusFormel(e.target.value);
                          aendereDatei((d) =>
                            setzeHilfsgroesse(d, i, { formel: e.target.value })
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={h.einheit}
                        disabled={schreibgeschuetzt}
                        aria-label={`Einheit Hilfsgröße ${i + 1}`}
                        className="w-24"
                        onChange={(e) =>
                          aendereDatei((d) =>
                            setzeHilfsgroesse(d, i, { einheit: e.target.value })
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {hilf
                        ? rechenwert(hilf.ergebnis, hilf.einheit || h.einheit)
                        : ""}
                    </TableCell>
                    <TableCell className="max-w-[12rem] text-xs">
                      <StatusText texte={status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={schreibgeschuetzt}
                        aria-label={`Hilfsgröße ${i + 1} löschen`}
                        onClick={() => aendereDatei((d) => loescheHilfsgroesse(d, i))}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="vorschau-titel">
        <h2 id="vorschau-titel" className="mb-3 text-lg font-medium">
          Formelvorschau
        </h2>
        <div
          className={cn(
            "min-h-[4rem] rounded-lg border border-border bg-card px-4 py-3",
            latexFehler && "border-destructive/40"
          )}
        >
          {latexFehler ? (
            <p className="text-sm text-destructive">{latexFehler}</p>
          ) : latex ? (
            <Katex>{latex}</Katex>
          ) : (
            <p className="text-sm text-muted-foreground">
              Wählen Sie eine Formelzeile, um die LaTeX-Vorschau zu sehen.
            </p>
          )}
          {fokusFormel && (
            <pre className="mt-2 overflow-x-auto font-mono text-xs text-muted-foreground">
              {fokusFormel}
            </pre>
          )}
        </div>
      </section>
    </>
  );
}
