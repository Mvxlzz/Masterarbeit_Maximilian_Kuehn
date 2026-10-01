"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { useAktivesSzenario } from "@/components/projekte-provider";
import { AlternativenLegende, FormSymbol } from "@/components/sensitivitaet/alternativen-legende";
import { useVergleich } from "@/components/szenarien/vergleich-provider";
import { NamenDialog, SeitenKopf, ZahlFeld, useKatalog } from "@/components/szenarien/teile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiFehler, gewichteDimension, type SzenarioVergleich } from "@/lib/api";
import {
  GEWICHT_TEXT,
  alternativen as altsAus,
  felder as felderAus,
  meldungenJeOrt,
  type Gewichte,
} from "@/lib/fall";
import { LEER, gewicht, zahl } from "@/lib/format";
import {
  faktoren as faktorenAus,
  fallGewichte,
  loescheSzenario,
  neuesSzenario,
  setzeSzenario,
  setzeSzenarioGewichte,
  spaltenVergleich,
  szenarien as szenarienAus,
  verschiebeFaktor,
  wirkung,
  zuordnen,
  type Szenario,
} from "@/lib/szenarien";
import { farbeAlternative, formAlternative } from "@/lib/sensitivitaet";
import { cn } from "@/lib/utils";

const DIMS: (keyof Gewichte)[] = ["tech", "oekon", "oekol"];
/** Feste Spaltenbreiten (table-layout: fixed), damit die rechts fixierten Ergebnisspalten exakt anliegen. */
const B_SZENARIO = 264;
const B_FAKTOR = 112;
const B_RANG = 190;
const B_WERT = 84;

function gewichteText(g: Gewichte): string {
  return DIMS.map((d) => gewicht(g[d])).join(" / ");
}

/** Dialog „Szenario bearbeiten“: Name, Beschreibung, eigene Gewichte, Reihenfolge der Anwendung, Löschen. */
function SzenarioDialog({
  s,
  onSchliessen,
}: {
  s: Szenario | null;
  onSchliessen: () => void;
}) {
  const { datei, aendereDatei, schreibgeschuetzt } = useFall();
  const [fehler, setFehler] = useState<string | null>(null);
  const [loeschen, setLoeschen] = useState(false);
  const alleFaktoren = useMemo(() => (datei ? faktorenAus(datei) : []), [datei]);
  if (!datei) return null;
  // Aktuellen Stand aus der Datei lesen, damit Änderungen im Dialog sofort erscheinen
  const aktuell = s ? szenarienAus(datei).find((x) => x.schluessel === s.schluessel) ?? null : null;
  const name = (k: string) => alleFaktoren.find((f) => f.schluessel === k)?.name ?? k;

  async function gewichtSetzen(sz: Szenario, dim: keyof Gewichte, wert: number) {
    setFehler(null);
    const g = sz.gewichte ?? fallGewichte(datei);
    if (wert < 0 || wert > 1) {
      setFehler("Ein Gewicht liegt zwischen 0 und 1.");
      return;
    }
    try {
      const r = await gewichteDimension(g, dim, wert);
      aendereDatei((d) =>
        setzeSzenarioGewichte(d, sz.schluessel, {
          tech: r.gewichte.tech,
          oekon: r.gewichte.oekon,
          oekol: r.gewichte.oekol,
        })
      );
    } catch (e) {
      setFehler(e instanceof ApiFehler ? e.message : "Gewicht konnte nicht gesetzt werden.");
    }
  }

  return (
    <Dialog
      open={!!aktuell}
      onOpenChange={(o) => {
        if (!o) {
          setLoeschen(false);
          setFehler(null);
          onSchliessen();
        }
      }}
    >
      {aktuell && (
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Szenario <span className="font-mono">{aktuell.schluessel}</span> bearbeiten
            </DialogTitle>
            <DialogDescription>
              Name, eigene Gewichte der Dimensionen und die Reihenfolge, in der die Einflussfaktoren wirken.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sz-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="sz-name"
                value={aktuell.name}
                readOnly={schreibgeschuetzt}
                onChange={(e) => aendereDatei((d) => setzeSzenario(d, aktuell.schluessel, { name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sz-beschreibung" className="text-sm font-medium">
                Beschreibung (optional)
              </label>
              <Input
                id="sz-beschreibung"
                value={aktuell.beschreibung}
                readOnly={schreibgeschuetzt}
                onChange={(e) =>
                  aendereDatei((d) => setzeSzenario(d, aktuell.schluessel, { beschreibung: e.target.value }))
                }
              />
            </div>

            <fieldset className="rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">Gewichte der Dimensionen</legend>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <Switch
                  checked={aktuell.gewichte !== null}
                  disabled={schreibgeschuetzt}
                  onCheckedChange={(an) =>
                    aendereDatei((d) => setzeSzenarioGewichte(d, aktuell.schluessel, an ? { ...fallGewichte(d) } : null))
                  }
                />
                Eigene Gewichte in diesem Szenario
              </label>
              {aktuell.gewichte ? (
                <div className="grid grid-cols-3 gap-2">
                  {DIMS.map((dim) => (
                    <div key={dim} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{GEWICHT_TEXT[dim]}</span>
                      <ZahlFeld
                        wert={aktuell.gewichte![dim]}
                        readOnly={schreibgeschuetzt}
                        label={`Gewicht ${GEWICHT_TEXT[dim]} in ${aktuell.schluessel}`}
                        onUebernehmen={(x) => void gewichtSetzen(aktuell, dim, x)}
                      />
                    </div>
                  ))}
                  <p className="col-span-3 text-xs text-muted-foreground">
                    Ein geändertes Gewicht verteilt den Rest im bisherigen Verhältnis auf die anderen Dimensionen.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ohne eigene Gewichte gelten die Gewichte des Falls ({gewichteText(fallGewichte(datei))}).
                </p>
              )}
              {fehler && (
                <p role="alert" className="mt-2 text-xs text-[var(--status-ausschluss-fg)]">
                  {fehler}
                </p>
              )}
            </fieldset>

            <fieldset className="rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">Reihenfolge der Anwendung</legend>
              {aktuell.faktoren.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Keine Einflussfaktoren zugeordnet. Setzen Sie Häkchen in der Matrix.
                </p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {aktuell.faktoren.map((k, i) => (
                    <li key={k} className="flex items-center gap-2 text-sm">
                      <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1">{name(k)}</span>
                      {!schreibgeschuetzt && (
                        <>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={i === 0}
                            aria-label={`${name(k)} früher anwenden`}
                            onClick={() => aendereDatei((d) => verschiebeFaktor(d, aktuell.schluessel, k, -1))}
                          >
                            <ArrowUp className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={i === aktuell.faktoren.length - 1}
                            aria-label={`${name(k)} später anwenden`}
                            onClick={() => aendereDatei((d) => verschiebeFaktor(d, aktuell.schluessel, k, 1))}
                          >
                            <ArrowDown className="size-3.5" aria-hidden />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Setzen zwei Faktoren dasselbe Feld, gilt der spätere.
              </p>
            </fieldset>
          </div>
          <DialogFooter className="sm:justify-between">
            {!schreibgeschuetzt ? (
              loeschen ? (
                <span className="flex items-center gap-2 text-sm">
                  Szenario löschen?
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      aendereDatei((d) => loescheSzenario(d, aktuell.schluessel));
                      setLoeschen(false);
                      onSchliessen();
                    }}
                  >
                    Löschen
                  </Button>
                </span>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => setLoeschen(true)}>
                  <Trash2 className="size-3.5" aria-hidden />
                  Szenario löschen
                </Button>
              )
            ) : (
              <span />
            )}
            <Button type="button" onClick={onSchliessen}>
              Fertig
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

function Rang1({
  v,
  namen,
  alle,
}: {
  v: SzenarioVergleich | undefined;
  namen: Record<string, string>;
  alle: string[];
}) {
  if (!v) return <span className="text-muted-foreground">{LEER}</span>;
  if (!v.ergebnis) {
    return (
      <span className="text-[var(--status-ausschluss-fg)]" title={v.fehler}>
        nicht auswertbar
      </span>
    );
  }
  const r = v.ergebnis.rangfolge[0];
  if (!r) return <span className="text-muted-foreground">keine zulässige</span>;
  return (
    <span className="inline-flex items-start gap-1.5">
      <span className="mt-1">
        <FormSymbol form={formAlternative(r)} farbe={farbeAlternative(r, alle)} />
      </span>
      <span className={cn(v.anderer_sieger && "font-semibold")}>
        {namen[r] ?? r}
        {v.anderer_sieger && (
          <span className="mt-0.5 block w-fit whitespace-nowrap rounded-full border border-border px-1.5 font-mono text-[10px] font-medium uppercase text-muted-foreground">
            anderer Sieger
          </span>
        )}
      </span>
    </span>
  );
}

export default function MatrixPage() {
  const { datei, meldungen, schreibgeschuetzt, aendereDatei } = useFall();
  const { vergleich, laedt } = useVergleich();
  const { szenario: aktivesSz } = useAktivesSzenario();
  const katalog = useKatalog();
  const [bearbeiten, setBearbeiten] = useState<Szenario | null>(null);
  const [neuOffen, setNeuOffen] = useState(false);

  const szen = useMemo(() => (datei ? szenarienAus(datei) : []), [datei]);
  const fakt = useMemo(() => (datei ? faktorenAus(datei) : []), [datei]);
  const felder = useMemo(() => (datei ? felderAus(datei) : []), [datei]);
  const alts = useMemo(() => (datei ? altsAus(datei) : []), [datei]);
  const orte = useMemo(() => meldungenJeOrt(meldungen), [meldungen]);

  if (!datei) return null;
  const namen = Object.fromEntries(alts.map((a) => [a.schluessel, a.name]));
  const alle = alts.map((a) => a.schluessel);
  const spalten = vergleich ? spaltenVergleich(vergleich, alle) : [];
  const je = new Map((vergleich ?? []).map((v) => [v.szenario, v]));
  const basis = je.get(null);

  const tabellenBreite = B_SZENARIO + Math.max(fakt.length * B_FAKTOR, 240) + B_RANG + spalten.length * B_WERT;

  const nutzwertZelle = (v: SzenarioVergleich | undefined, a: string) => {
    if (!v?.ergebnis) return LEER;
    const w = v.ergebnis.nutzwert[a];
    return w === undefined ? "K.O." : zahl(w, 2);
  };

  const ergebnisZellen = (v: SzenarioVergleich | undefined, grund = "bg-card") => (
    <>
      <td
        className={cn("sticky z-10 border-l border-border px-3 py-2 align-top text-sm", grund)}
        style={{ right: spalten.length * B_WERT }}
      >
        <Rang1 v={v} namen={namen} alle={alle} />
      </td>
      {spalten.map((a, i) => (
        <td
          key={a}
          className={cn("sticky z-10 px-2 py-2 text-right align-top font-mono text-[13px] tabular-nums", grund)}
          style={{ right: (spalten.length - 1 - i) * B_WERT }}
          data-testid={`matrix-${v?.szenario ?? "basis"}-${a}`}
        >
          <span className={cn(nutzwertZelle(v, a) === "K.O." && "text-[var(--status-ausschluss-fg)]")}>
            {nutzwertZelle(v, a)}
          </span>
        </td>
      ))}
    </>
  );

  return (
    <>
      <SeitenKopf
        titel="Szenario-Matrix"
        abschnitt="Abschnitt 4.5.4"
        text="Zeilen sind Szenarien, Spalten Einflussfaktoren. Ein Häkchen ordnet den Faktor dem Szenario zu, ein neues Häkchen hängt ihn hinten an; die Zahl daneben ist die Reihenfolge der Anwendung. Rechts stehen Rang 1 und die Gesamtnutzwerte je Szenario."
        aktionen={
          !schreibgeschuetzt && (
            <Button type="button" size="sm" onClick={() => setNeuOffen(true)}>
              <Plus className="size-3.5" aria-hidden />
              Neues Szenario
            </Button>
          )
        }
      />

      <div
        className="relative overflow-x-auto rounded-lg border border-border bg-card"
        role="region"
        aria-label="Szenario-Matrix, waagerecht scrollbar"
        tabIndex={0}
      >
        <table
          className="table-fixed border-separate border-spacing-0 text-sm"
          style={{ width: tabellenBreite, minWidth: "100%" }}
          aria-busy={laedt}
        >
          <colgroup>
            <col style={{ width: B_SZENARIO }} />
            {fakt.map((f) => (
              <col key={f.schluessel} style={{ width: B_FAKTOR }} />
            ))}
            {fakt.length === 0 && <col style={{ width: 240 }} />}
            <col style={{ width: B_RANG }} />
            {spalten.map((a) => (
              <col key={a} style={{ width: B_WERT }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-20 border-b border-border bg-card px-3 py-2 text-left align-bottom font-medium">
                Szenario
              </th>
              {fakt.map((f) => (
                <th
                  key={f.schluessel}
                  scope="col"
                  className="border-b border-border px-2 py-2 text-left align-bottom text-xs font-medium"
                  title={`${katalog?.faktortypen?.[f.typ] ?? f.typ}: ${wirkung(f, felder, katalog?.einstellungen)}`}
                >
                  <span className="line-clamp-3">{f.name}</span>
                </th>
              ))}
              {fakt.length === 0 && (
                <th scope="col" className="border-b border-border px-3 py-2 text-left text-xs font-normal text-muted-foreground">
                  Noch keine Einflussfaktoren, siehe Faktorbibliothek
                </th>
              )}
              <th
                scope="col"
                className="sticky z-20 border-b border-l border-border bg-card px-3 py-2 text-left align-bottom font-medium"
                style={{ right: spalten.length * B_WERT }}
              >
                Rang 1
              </th>
              {spalten.map((a, i) => (
                <th
                  key={a}
                  scope="col"
                  className="sticky z-20 border-b border-border bg-card px-2 py-2 text-right align-bottom text-xs font-medium"
                  style={{ right: (spalten.length - 1 - i) * B_WERT }}
                >
                  <span className="flex justify-end" title={namen[a] ?? a}>
                    <FormSymbol form={formAlternative(a)} farbe={farbeAlternative(a, alle)} size={12} />
                    <span className="sr-only">{namen[a] ?? a}</span>
                  </span>
                  <span className="block font-normal text-muted-foreground">[Punkte]</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[var(--flaeche-zweit)] [&>*]:border-b [&>*]:border-border">
              <th scope="row" className="sticky left-0 z-10 bg-[var(--flaeche-zweit)] px-3 py-2 text-left align-top font-normal">
                <span className="font-medium">Basisfall</span>
                <span className="block text-xs text-muted-foreground">ohne Einflussfaktoren</span>
              </th>
              {fakt.map((f) => (
                <td key={f.schluessel} className="px-2 py-2 text-muted-foreground" aria-hidden>
                  {" "}
                </td>
              ))}
              {fakt.length === 0 && <td />}
              {ergebnisZellen(basis, "bg-[var(--flaeche-zweit)]")}
            </tr>
            {szen.map((s) => {
              const v = je.get(s.schluessel);
              const zeilenFehler = [
                ...(orte[`Szenario ${s.name}`] ?? []).map((m) => m.text),
                ...(v?.fehler ? [v.fehler] : []),
              ];
              return (
                <tr
                  key={s.schluessel}
                  className="[&>*]:border-b [&>*]:border-border last:[&>*]:border-b-0"
                  data-ort={`Szenario ${s.name}`}
                  data-testid={`matrix-zeile-${s.schluessel}`}
                >
                  <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left align-top font-normal">
                    <div className="flex items-start gap-2">
                      <span className="w-9 shrink-0 pt-px font-mono text-xs text-muted-foreground">{s.schluessel}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {s.name}
                          {s.schluessel === aktivesSz && (
                            <span
                              className="ml-1.5 whitespace-nowrap rounded-full border border-primary/40 px-1.5 align-middle font-mono text-[10px] font-medium uppercase text-primary"
                              title="Im Pfad gewählt: Ergebnis und Sensitivität zeigen dieses Szenario"
                            >
                              aktiv
                            </span>
                          )}
                        </span>
                        {s.gewichte && (
                          <span className="block text-xs text-muted-foreground">
                            eigene Gewichte {gewichteText(s.gewichte)}
                          </span>
                        )}
                        {zeilenFehler.length > 0 && (
                          <span role="alert" className="block text-xs text-[var(--status-ausschluss-fg)]">
                            {zeilenFehler[0]}
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Szenario ${s.schluessel} bearbeiten`}
                        onClick={() => setBearbeiten(s)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </th>
                  {fakt.map((f) => {
                    const pos = s.faktoren.indexOf(f.schluessel);
                    return (
                      <td key={f.schluessel} className="px-2 py-2 align-top">
                        <label className="inline-flex items-center gap-1.5">
                          <Checkbox
                            checked={pos >= 0}
                            disabled={schreibgeschuetzt}
                            aria-label={`${f.name} in ${s.schluessel} ${s.name}`}
                            onCheckedChange={(an) =>
                              aendereDatei((d) => zuordnen(d, s.schluessel, f.schluessel, Boolean(an)))
                            }
                          />
                          {pos >= 0 && s.faktoren.length > 1 && (
                            <span className="font-mono text-[11px] text-muted-foreground" title="Reihenfolge der Anwendung">
                              {pos + 1}
                            </span>
                          )}
                        </label>
                      </td>
                    );
                  })}
                  {fakt.length === 0 && <td />}
                  {ergebnisZellen(v)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <AlternativenLegende alternativen={alts.filter((a) => spalten.includes(a.schluessel))} />
        <p>
          Gesamtnutzwerte in Punkten. K.O.: im Szenario ausgeschlossen. „Anderer Sieger“: eine andere Alternative
          als im Basisfall liegt auf Rang 1.
        </p>
      </div>

      <SzenarioDialog s={bearbeiten} onSchliessen={() => setBearbeiten(null)} />
      <NamenDialog
        offen={neuOffen}
        onOffen={setNeuOffen}
        titel="Neues Szenario"
        beschreibung="Das Szenario startet ohne Einflussfaktoren. Ordnen Sie danach in der Matrix Faktoren zu."
        platzhalter="z. B. Teures Neuteil"
        knopf="Anlegen"
        onAbsenden={(name) => aendereDatei((d) => neuesSzenario(d, name).datei)}
      />
    </>
  );
}
