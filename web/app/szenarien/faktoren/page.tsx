"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { Katex } from "@/components/katex";
import {
  NamenDialog,
  SeitenKopf,
  ZahlFeld,
  ZeilenMeldung,
  useKatalog,
} from "@/components/szenarien/teile";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { holeLatex, type FallDatei, type Meldung } from "@/lib/api";
import {
  DIMENSION_TEXT,
  alternativen as altsAus,
  felder as felderAus,
  meldungenJeOrt,
  type Alternative,
  type Feld,
} from "@/lib/fall";
import {
  EINSTELLUNG_JA_NEIN,
  faktoren as faktorenAus,
  loescheEinstellung,
  loescheFaktor,
  loescheWerteintrag,
  loescheZuschlagPosition,
  neueZuschlagPosition,
  neuerFaktor,
  setzeEinstellung,
  setzeFaktor,
  setzeWerteintrag,
  setzeZuschlagPosition,
  szenarien as szenarienAus,
  werteintraege,
  wirkung,
  type Faktor,
  type FaktorTyp,
  type WertArt,
} from "@/lib/szenarien";
import { cn } from "@/lib/utils";

const TYPEN: FaktorTyp[] = ["wertaenderung", "zuschlag", "einstellung"];
const TYP_STANDARD: Record<FaktorTyp, string> = {
  wertaenderung: "Wertänderung",
  zuschlag: "Zuschlag",
  einstellung: "Einstellung",
};
const ART_TEXT: Record<WertArt, string> = { setzen: "setzen auf", skalieren: "skalieren mit" };

type Aendern = (fn: (d: FallDatei) => FallDatei) => void;

function Abschnitt({ titel, text, children }: { titel: string; text: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">{titel}</h2>
        <p className="mt-0.5 max-w-[80ch] text-xs text-muted-foreground blocksatz">{text}</p>
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ Wertänderung */

function Wertaenderung({
  f,
  felder,
  nurLesen,
  aendern,
}: {
  f: Faktor;
  felder: Feld[];
  nurLesen: boolean;
  aendern: Aendern;
}) {
  const [neuFeld, setNeuFeld] = useState<string>("");
  const [neuArt, setNeuArt] = useState<WertArt>("setzen");
  const [neuWert, setNeuWert] = useState<number>(0);
  const eintraege = werteintraege(f);
  const feldText = (n: string) => felder.find((x) => x.name === n)?.bezeichnung ?? n;
  const einheit = (n: string, art: WertArt) =>
    art === "skalieren" ? "Faktor" : (felder.find((x) => x.name === n)?.einheit ?? "");

  return (
    <Abschnitt
      titel="Felder setzen oder skalieren"
      text="Setzen ersetzt den Feldwert im Szenario, skalieren multipliziert ihn. Die Werte des Datenblatts bleiben unverändert."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[42%]">Feld</TableHead>
            <TableHead>Art</TableHead>
            <TableHead className="w-[150px] text-right">Wert</TableHead>
            <TableHead>Einheit</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Löschen</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eintraege.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                Noch kein Feld. Wählen Sie unten ein Feld und einen Wert.
              </TableCell>
            </TableRow>
          )}
          {eintraege.map((e) => (
            <TableRow key={`${e.art}:${e.feld}`}>
              <TableCell className="whitespace-normal">
                {feldText(e.feld)}
                <span className="ml-2 font-mono text-xs text-muted-foreground">{e.feld}</span>
              </TableCell>
              <TableCell>
                <Select
                  value={e.art}
                  disabled={nurLesen}
                  onValueChange={(v) =>
                    aendern((d) =>
                      setzeWerteintrag(d, f.schluessel, { ...e, art: v as WertArt }, { feld: e.feld, art: e.art })
                    )
                  }
                >
                  <SelectTrigger className="h-8 min-w-[130px]" aria-label={`Art für ${feldText(e.feld)}`}>
                    <SelectValue>{ART_TEXT[e.art]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setzen">{ART_TEXT.setzen}</SelectItem>
                    <SelectItem value="skalieren">{ART_TEXT.skalieren}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <ZahlFeld
                  wert={e.wert}
                  readOnly={nurLesen}
                  label={`Wert für ${feldText(e.feld)}`}
                  onUebernehmen={(x) => aendern((d) => setzeWerteintrag(d, f.schluessel, { ...e, wert: x }))}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">{einheit(e.feld, e.art)}</TableCell>
              <TableCell>
                {!nurLesen && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${feldText(e.feld)} entfernen`}
                    onClick={() => aendern((d) => loescheWerteintrag(d, f.schluessel, e.feld, e.art))}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!nurLesen && (
        <div className="flex flex-wrap items-end gap-2 border-t border-border px-4 py-3">
          <div className="flex min-w-[260px] flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Feld</span>
            <Select value={neuFeld} onValueChange={(v) => setNeuFeld(String(v ?? ""))}>
              <SelectTrigger className="h-8 w-full" aria-label="Neues Feld">
                <SelectValue placeholder="Feld wählen">{neuFeld ? feldText(neuFeld) : "Feld wählen"}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {felder.map((x) => (
                  <SelectItem key={x.name} value={x.name}>
                    {x.bezeichnung}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Art</span>
            <Select value={neuArt} onValueChange={(v) => setNeuArt(v as WertArt)}>
              <SelectTrigger className="h-8 min-w-[130px]" aria-label="Art des neuen Eintrags">
                <SelectValue>{ART_TEXT[neuArt]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="setzen">{ART_TEXT.setzen}</SelectItem>
                <SelectItem value="skalieren">{ART_TEXT.skalieren}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[140px] flex-col gap-1">
            <span className="text-xs text-muted-foreground">Wert</span>
            <ZahlFeld wert={neuWert} label="Wert des neuen Eintrags" onUebernehmen={setNeuWert} />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!neuFeld}
            onClick={() => {
              aendern((d) => setzeWerteintrag(d, f.schluessel, { feld: neuFeld, art: neuArt, wert: neuWert }));
              setNeuFeld("");
            }}
          >
            <Plus className="size-3.5" aria-hidden />
            Hinzufügen
          </Button>
        </div>
      )}
    </Abschnitt>
  );
}

/* ------------------------------------------------------------------ Zuschlag */

function FormelVorschau({ formel }: { formel: string }) {
  const [latex, setLatex] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      holeLatex(formel)
        .then((r) => setLatex(r.latex))
        .catch(() => setLatex(null));
    }, 300);
    return () => clearTimeout(t);
  }, [formel]);
  if (!latex) return null;
  return (
    <div className="mt-1 overflow-x-auto text-xs text-muted-foreground">
      <Katex>{latex}</Katex>
    </div>
  );
}

function Zuschlag({
  f,
  alts,
  meldungen,
  nurLesen,
  aendern,
}: {
  f: Faktor;
  alts: Alternative[];
  meldungen: Meldung[];
  nurLesen: boolean;
  aendern: Aendern;
}) {
  const aufbereitung = alts.filter((a) => a.art === "aufbereitung").map((a) => a.schluessel);
  return (
    <Abschnitt
      titel="Zusätzliche Positionen"
      text={'Formelsprache wie unter „Fall bearbeiten“. kosten("…") und co2("…") stehen für die Summe der Positionen einer Alternative ohne Einflussfaktoren.'}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dimension</TableHead>
            <TableHead className="w-[24%]">Bezeichnung</TableHead>
            <TableHead className="w-[30%]">Formel</TableHead>
            <TableHead>gilt für</TableHead>
            <TableHead>Prüfung</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Löschen</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {f.positionen.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                Noch keine Position.
              </TableCell>
            </TableRow>
          )}
          {f.positionen.map((p, i) => {
            const zeile = meldungen.filter((m) => p.formel.trim() && m.text.includes(`„${p.formel}“`));
            return (
              <TableRow key={i} data-ort={`Einflussfaktor ${f.name}`} className="align-top">
                <TableCell>
                  <Select
                    value={p.dimension}
                    disabled={nurLesen}
                    onValueChange={(v) =>
                      aendern((d) =>
                        setzeZuschlagPosition(d, f.schluessel, i, { dimension: v as "oekon" | "oekol" })
                      )
                    }
                  >
                    <SelectTrigger className="h-8 min-w-[120px]" aria-label={`Dimension Position ${i + 1}`}>
                      <SelectValue>{DIMENSION_TEXT[p.dimension]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oekon">{DIMENSION_TEXT.oekon}</SelectItem>
                      <SelectItem value="oekol">{DIMENSION_TEXT.oekol}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={p.bezeichnung}
                    readOnly={nurLesen}
                    aria-label={`Bezeichnung Position ${i + 1}`}
                    className="h-8"
                    onChange={(e) =>
                      aendern((d) => setzeZuschlagPosition(d, f.schluessel, i, { bezeichnung: e.target.value }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={p.formel}
                    readOnly={nurLesen}
                    aria-label={`Formel Position ${i + 1}`}
                    aria-invalid={zeile.length > 0}
                    className="h-8 font-mono text-[13px]"
                    onChange={(e) =>
                      aendern((d) => setzeZuschlagPosition(d, f.schluessel, i, { formel: e.target.value }))
                    }
                  />
                  <FormelVorschau formel={p.formel} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {alts
                      .filter((a) => a.art !== "ausscheiden")
                      .map((a) => {
                        const id = `gilt-${f.schluessel}-${i}-${a.schluessel}`;
                        return (
                          <label key={a.schluessel} htmlFor={id} className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              id={id}
                              checked={p.alternativen.includes(a.schluessel)}
                              disabled={nurLesen}
                              onCheckedChange={(an) =>
                                aendern((d) =>
                                  setzeZuschlagPosition(d, f.schluessel, i, {
                                    alternativen: an
                                      ? [...p.alternativen.filter((x) => x !== a.schluessel), a.schluessel]
                                      : p.alternativen.filter((x) => x !== a.schluessel),
                                  })
                                )
                              }
                            />
                            {a.name}
                          </label>
                        );
                      })}
                  </div>
                </TableCell>
                <TableCell className="max-w-[24ch] whitespace-normal text-xs" data-testid={`zuschlag-pruefung-${i}`}>
                  <ZeilenMeldung meldungen={zeile} />
                </TableCell>
                <TableCell>
                  {!nurLesen && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Position ${i + 1} entfernen`}
                      onClick={() => aendern((d) => loescheZuschlagPosition(d, f.schluessel, i))}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {!nurLesen && (
        <div className="border-t border-border px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              aendern((d) =>
                neueZuschlagPosition(d, f.schluessel, {
                  dimension: "oekon",
                  bezeichnung: "Neue Position",
                  formel: "0",
                  alternativen: aufbereitung,
                  gruppe: "",
                })
              )
            }
          >
            <Plus className="size-3.5" aria-hidden />
            Position hinzufügen
          </Button>
        </div>
      )}
    </Abschnitt>
  );
}

/* ------------------------------------------------------------------ Einstellung */

function Einstellungen({
  f,
  texte,
  nurLesen,
  aendern,
}: {
  f: Faktor;
  texte: Record<string, string>;
  nurLesen: boolean;
  aendern: Aendern;
}) {
  const alle = Object.keys(texte);
  const frei = alle.filter((k) => !(k in f.einstellungen));
  const standard = (k: string) => (k === "harte_frist" ? 1 : EINSTELLUNG_JA_NEIN.has(k) ? 0 : 1);
  return (
    <Abschnitt
      titel="Einstellungen"
      text="Gate und harte Frist: ja oder nein. Technischer Dimensionswert ohne Verfahren: Stufe 1 bis 5 (Konvention aus Abschnitt 4.3.1)."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60%]">Einstellung</TableHead>
            <TableHead>Wert im Szenario</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Löschen</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.keys(f.einstellungen).length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-sm text-muted-foreground">
                Noch keine Einstellung.
              </TableCell>
            </TableRow>
          )}
          {Object.entries(f.einstellungen).map(([k, w]) => (
            <TableRow key={k}>
              <TableCell>
                <Select
                  value={k}
                  disabled={nurLesen}
                  onValueChange={(v) =>
                    aendern((d) => setzeEinstellung(d, f.schluessel, String(v), standard(String(v)), k))
                  }
                >
                  <SelectTrigger className="h-8 w-full" aria-label="Einstellung">
                    <SelectValue>{texte[k] ?? k}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[k, ...frei].map((x) => (
                      <SelectItem key={x} value={x}>
                        {texte[x] ?? x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {EINSTELLUNG_JA_NEIN.has(k) ? (
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={Boolean(w)}
                      disabled={nurLesen}
                      aria-label={texte[k] ?? k}
                      onCheckedChange={(an) => aendern((d) => setzeEinstellung(d, f.schluessel, k, an ? 1 : 0))}
                    />
                    {w ? "ja" : "nein"}
                  </label>
                ) : (
                  <Select
                    value={String(w)}
                    disabled={nurLesen}
                    onValueChange={(v) => aendern((d) => setzeEinstellung(d, f.schluessel, k, Number(v)))}
                  >
                    <SelectTrigger className="h-8 w-[120px]" aria-label={texte[k] ?? k}>
                      <SelectValue>Stufe {w}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Stufe {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell>
                {!nurLesen && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${texte[k] ?? k} entfernen`}
                    onClick={() => aendern((d) => loescheEinstellung(d, f.schluessel, k))}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!nurLesen && frei.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => aendern((d) => setzeEinstellung(d, f.schluessel, frei[0], standard(frei[0])))}
          >
            <Plus className="size-3.5" aria-hidden />
            Einstellung hinzufügen
          </Button>
        </div>
      )}
    </Abschnitt>
  );
}

/* ------------------------------------------------------------------ Seite */

export default function FaktorenPage() {
  const { datei, meldungen, schreibgeschuetzt, aendereDatei } = useFall();
  const katalog = useKatalog();
  const [wahl, setWahl] = useState<string | null>(null);
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuTyp, setNeuTyp] = useState<FaktorTyp>("wertaenderung");
  const [loeschenFrage, setLoeschenFrage] = useState(false);

  const liste = useMemo(() => (datei ? faktorenAus(datei) : []), [datei]);
  const szen = useMemo(() => (datei ? szenarienAus(datei) : []), [datei]);
  const felder = useMemo(() => (datei ? felderAus(datei) : []), [datei]);
  const alts = useMemo(() => (datei ? altsAus(datei) : []), [datei]);
  const orte = useMemo(() => meldungenJeOrt(meldungen), [meldungen]);

  if (!datei) return null;
  const typText = (t: string) => katalog?.faktortypen?.[t] ?? TYP_STANDARD[t as FaktorTyp] ?? t;
  const einst = katalog?.einstellungen ?? {};
  const aktiv = liste.find((f) => f.schluessel === wahl) ?? liste[0] ?? null;
  const inSzenarien = (k: string) => szen.filter((s) => s.faktoren.includes(k)).map((s) => s.schluessel);
  const fehlerJeFaktor = (f: Faktor) => (orte[`Einflussfaktor ${f.name}`] ?? []).filter((m) => m.stufe === "fehler");

  return (
    <>
      <SeitenKopf
        titel="Faktorbibliothek"
        abschnitt="Tabelle 20"
        text="Einflussfaktoren sind benannte Änderungen am Fall. Wertänderung setzt oder skaliert Felder, Zuschlag fügt Kosten- oder CO₂-Positionen hinzu, Einstellung ändert Gate, harte Frist oder die technische Konvention. Zugeordnet werden sie in der Szenario-Matrix."
        aktionen={
          !schreibgeschuetzt && (
            <Button type="button" size="sm" onClick={() => setNeuOffen(true)}>
              <Plus className="size-3.5" aria-hidden />
              Neuer Einflussfaktor
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Einflussfaktoren" className="self-start rounded-lg border border-border bg-card">
          <p className="border-b border-border px-3 py-2 font-mono text-[11px] font-medium uppercase text-muted-foreground">
            {liste.length} Einflussfaktoren
          </p>
          <ul className="max-h-[calc(100vh-260px)] overflow-y-auto p-1.5">
            {liste.map((f) => {
              const s = inSzenarien(f.schluessel);
              const istAktiv = aktiv?.schluessel === f.schluessel;
              const fehler = fehlerJeFaktor(f).length > 0;
              return (
                <li key={f.schluessel}>
                  <button
                    type="button"
                    aria-current={istAktiv ? "true" : undefined}
                    onClick={() => {
                      setWahl(f.schluessel);
                      setLoeschenFrage(false);
                    }}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent",
                      istAktiv && "bg-accent"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{f.name}</span>
                      {fehler && (
                        <span className="rounded-full border border-[var(--status-ausschluss-fg)] px-1.5 font-mono text-[10px] uppercase text-[var(--status-ausschluss-fg)]">
                          Fehler
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {typText(f.typ)} · {s.length ? s.join(", ") : "keinem Szenario zugeordnet"}
                    </span>
                  </button>
                </li>
              );
            })}
            {liste.length === 0 && (
              <li className="px-2.5 py-3 text-sm text-muted-foreground">Noch kein Einflussfaktor.</li>
            )}
          </ul>
        </nav>

        {aktiv && (
          <div className="flex min-w-0 flex-col gap-4" data-testid="faktor-editor">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                <div className="flex flex-col gap-1">
                  <label htmlFor="faktor-name" className="text-xs text-muted-foreground">
                    Name
                  </label>
                  <Input
                    id="faktor-name"
                    value={aktiv.name}
                    readOnly={schreibgeschuetzt}
                    onChange={(e) => aendereDatei((d) => setzeFaktor(d, aktiv.schluessel, { name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="faktor-typ" className="text-xs text-muted-foreground">
                    Typ
                  </label>
                  <Select
                    value={aktiv.typ}
                    disabled={schreibgeschuetzt}
                    onValueChange={(v) => aendereDatei((d) => setzeFaktor(d, aktiv.schluessel, { typ: v as FaktorTyp }))}
                  >
                    <SelectTrigger id="faktor-typ" className="w-full">
                      <SelectValue>{typText(aktiv.typ)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TYPEN.map((t) => (
                        <SelectItem key={t} value={t}>
                          {typText(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label htmlFor="faktor-beschreibung" className="text-xs text-muted-foreground">
                    Beschreibung (optional)
                  </label>
                  <Input
                    id="faktor-beschreibung"
                    value={aktiv.beschreibung}
                    readOnly={schreibgeschuetzt}
                    onChange={(e) =>
                      aendereDatei((d) => setzeFaktor(d, aktiv.schluessel, { beschreibung: e.target.value }))
                    }
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {katalog?.faktortyp_hilfe?.[aktiv.typ] ?? ""}. Wirkung: {wirkung(aktiv, felder, einst)}.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <p className="text-sm">
                  Zugeordnet in:{" "}
                  {inSzenarien(aktiv.schluessel).length ? (
                    <span className="font-mono text-xs">{inSzenarien(aktiv.schluessel).join(", ")}</span>
                  ) : (
                    <span className="text-muted-foreground">noch keinem Szenario</span>
                  )}
                  {" · "}
                  <Link href="/szenarien/matrix" className="text-primary underline-offset-2 hover:underline">
                    zur Szenario-Matrix
                  </Link>
                </p>
                {!schreibgeschuetzt &&
                  (loeschenFrage ? (
                    <span className="flex items-center gap-2 text-sm">
                      Auch aus allen Szenarien entfernen und löschen?
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          aendereDatei((d) => loescheFaktor(d, aktiv.schluessel));
                          setWahl(null);
                          setLoeschenFrage(false);
                        }}
                      >
                        Löschen
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setLoeschenFrage(false)}>
                        Abbrechen
                      </Button>
                    </span>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => setLoeschenFrage(true)}>
                      <Trash2 className="size-3.5" aria-hidden />
                      Einflussfaktor löschen
                    </Button>
                  ))}
              </div>
              {fehlerJeFaktor(aktiv).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm" data-ort={`Einflussfaktor ${aktiv.name}`}>
                  {fehlerJeFaktor(aktiv).map((m, i) => (
                    <li key={i} role="alert" className="text-[var(--status-ausschluss-fg)]">
                      {m.text}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(aktiv.typ === "wertaenderung" || werteintraege(aktiv).length > 0) && (
              <Wertaenderung f={aktiv} felder={felder} nurLesen={schreibgeschuetzt} aendern={aendereDatei} />
            )}
            {(aktiv.typ === "zuschlag" || aktiv.positionen.length > 0) && (
              <Zuschlag
                f={aktiv}
                alts={alts}
                meldungen={orte[`Einflussfaktor ${aktiv.name}`] ?? []}
                nurLesen={schreibgeschuetzt}
                aendern={aendereDatei}
              />
            )}
            {(aktiv.typ === "einstellung" || Object.keys(aktiv.einstellungen).length > 0) && (
              <Einstellungen f={aktiv} texte={einst} nurLesen={schreibgeschuetzt} aendern={aendereDatei} />
            )}
          </div>
        )}
      </div>

      <NamenDialog
        offen={neuOffen}
        onOffen={setNeuOffen}
        titel="Neuer Einflussfaktor"
        beschreibung="Benennen Sie die Änderung, zum Beispiel „Lieferengpass Neuteil“. Den Inhalt legen Sie danach fest."
        platzhalter="z. B. Vertragsstrafe verdoppelt"
        knopf="Anlegen"
        onAbsenden={(name) => {
          // Der Schlüssel hängt nur von den vorhandenen Faktoren ab, deshalb vorab bestimmbar
          setWahl(neuerFaktor(datei, name, neuTyp).schluessel);
          aendereDatei((d) => neuerFaktor(d, name, neuTyp).datei);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="neu-typ" className="text-sm font-medium">
            Typ
          </label>
          <Select value={neuTyp} onValueChange={(v) => setNeuTyp(v as FaktorTyp)}>
            <SelectTrigger id="neu-typ" className="w-full">
              <SelectValue>{typText(neuTyp)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TYPEN.map((t) => (
                <SelectItem key={t} value={t}>
                  {typText(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{katalog?.faktortyp_hilfe?.[neuTyp]}</p>
        </div>
      </NamenDialog>
    </>
  );
}
