"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useFall } from "@/components/fall/fall-provider";
import { HerkunftBadge } from "@/components/fall/herkunft-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { eingabe, kompakt, lesen, UNBEGRENZT } from "@/lib/format";
import {
  felder as felderAus,
  loescheFeld,
  meldungenJeOrt,
  neuesFeld,
  setzeFeldwert,
  strafeMaxName,
  type Feld,
  type Herkunft,
} from "@/lib/fall";
import { cn } from "@/lib/utils";

function wertAlsText(wert: number | null, unbegrenztErlaubt: boolean): string {
  if (wert === null) return unbegrenztErlaubt ? UNBEGRENZT : "";
  if (wert === Infinity) return UNBEGRENZT;
  return eingabe(wert);
}

function spanneText(spanne: [number, number] | null): string {
  if (!spanne) return "—";
  return `${kompakt(spanne[0])} … ${kompakt(spanne[1])}`;
}

function FeldHinzufuegenDialog({
  disabled,
  onAnlegen,
}: {
  disabled: boolean;
  onAnlegen: (feld: Feld) => void;
}) {
  const [offen, setOffen] = useState(false);
  const [name, setName] = useState("");
  const [bezeichnung, setBezeichnung] = useState("");
  const [wertText, setWertText] = useState("0");
  const [einheit, setEinheit] = useState("");
  const [quelle, setQuelle] = useState("");
  const [gruppe, setGruppe] = useState("Eigene Felder");
  const [vonText, setVonText] = useState("");
  const [bisText, setBisText] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  function zuruecksetzen() {
    setName("");
    setBezeichnung("");
    setWertText("0");
    setEinheit("");
    setQuelle("");
    setGruppe("Eigene Felder");
    setVonText("");
    setBisText("");
    setFehler(null);
  }

  function speichern() {
    try {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name.trim())) {
        setFehler("Der Name muss mit einem Buchstaben oder Unterstrich beginnen.");
        return;
      }
      if (!bezeichnung.trim()) {
        setFehler("Die Bezeichnung fehlt.");
        return;
      }
      const wert = lesen(wertText);
      let spanne: [number, number] | null = null;
      if (vonText.trim() || bisText.trim()) {
        const von = lesen(vonText);
        const bis = lesen(bisText);
        if (von > bis) {
          setFehler("Die Untergrenze der Spanne liegt über der Obergrenze.");
          return;
        }
        spanne = [von, bis];
      }
      onAnlegen({
        name: name.trim(),
        bezeichnung: bezeichnung.trim(),
        wert,
        einheit: einheit.trim(),
        herkunft: "N",
        quelle: quelle.trim(),
        spanne,
        gruppe: gruppe.trim() || "Eigene Felder",
        text: "",
      });
      zuruecksetzen();
      setOffen(false);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Eingabe ungültig.");
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        aria-label="Feld hinzufügen"
        onClick={() => setOffen(true)}
      >
        <Plus className="size-3.5" aria-hidden />
        Feld hinzufügen
      </Button>
      <Dialog
        open={offen}
        onOpenChange={(o) => {
          setOffen(o);
          if (!o) zuruecksetzen();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feld hinzufügen</DialogTitle>
            <DialogDescription>
              Neues Eingabefeld mit Herkunft Nutzerangabe (N). Der Name steht in Formeln.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="feld-name">Name</Label>
              <Input
                id="feld-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-mono"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feld-bez">Bezeichnung</Label>
              <Input
                id="feld-bez"
                value={bezeichnung}
                onChange={(e) => setBezeichnung(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="feld-wert">Wert</Label>
                <Input
                  id="feld-wert"
                  value={wertText}
                  onChange={(e) => setWertText(e.target.value)}
                  className="font-mono text-right"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="feld-einheit">Einheit</Label>
                <Input
                  id="feld-einheit"
                  value={einheit}
                  onChange={(e) => setEinheit(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feld-quelle">Quelle</Label>
              <Input
                id="feld-quelle"
                value={quelle}
                onChange={(e) => setQuelle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="feld-von">Spanne von</Label>
                <Input
                  id="feld-von"
                  value={vonText}
                  onChange={(e) => setVonText(e.target.value)}
                  className="font-mono text-right"
                  placeholder="optional"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="feld-bis">bis</Label>
                <Input
                  id="feld-bis"
                  value={bisText}
                  onChange={(e) => setBisText(e.target.value)}
                  className="font-mono text-right"
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feld-gruppe">Gruppe</Label>
              <Input
                id="feld-gruppe"
                value={gruppe}
                onChange={(e) => setGruppe(e.target.value)}
              />
            </div>
            {fehler && (
              <p role="alert" className="text-sm text-destructive">
                {fehler}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOffen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={speichern}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WertZelle({
  feld,
  disabled,
  warnung,
  aufUnbegrenzt,
  onCommit,
}: {
  feld: Feld;
  disabled: boolean;
  warnung: string | null;
  aufUnbegrenzt: boolean;
  onCommit: (wert: number | null) => void;
}) {
  const anzeige = wertAlsText(feld.wert, aufUnbegrenzt);
  const [text, setText] = useState(anzeige);
  const [lokalFehler, setLokalFehler] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Input
        value={text}
        disabled={disabled}
        aria-label={`Wert ${feld.name}`}
        aria-invalid={Boolean(lokalFehler || warnung)}
        className={cn(
          "h-8 w-[7.5rem] font-mono text-right",
          (lokalFehler || warnung) && "border-destructive"
        )}
        onChange={(e) => {
          setText(e.target.value);
          setLokalFehler(null);
        }}
        onBlur={() => {
          const roh = text.trim();
          if (roh === "") {
            setLokalFehler("Wert fehlt.");
            setText(anzeige);
            return;
          }
          try {
            const gelesen = lesen(roh);
            if (gelesen === Infinity) {
              if (!aufUnbegrenzt) {
                setLokalFehler("Nur die Obergrenze der Vertragsstrafe darf unbegrenzt sein.");
                setText(anzeige);
                return;
              }
              setLokalFehler(null);
              setText(UNBEGRENZT);
              onCommit(null);
              return;
            }
            setLokalFehler(null);
            setText(eingabe(gelesen));
            onCommit(gelesen);
          } catch (e) {
            setLokalFehler(e instanceof Error ? e.message : "Keine Zahl.");
            setText(anzeige);
          }
        }}
      />
      {warnung && (
        <span className="max-w-[12rem] text-right text-[11px] text-destructive">{warnung}</span>
      )}
      {lokalFehler && (
        <span className="max-w-[12rem] text-right text-[11px] text-destructive">{lokalFehler}</span>
      )}
    </div>
  );
}

/** Isolierte Wertzelle mit key-Remount bei Feldwert-Änderung von außen. */
function WertZelleGekoppelt(props: {
  feld: Feld;
  disabled: boolean;
  warnung: string | null;
  aufUnbegrenzt: boolean;
  onCommit: (wert: number | null) => void;
}) {
  return (
    <WertZelle
      key={`${props.feld.name}:${props.feld.wert}:${props.feld.herkunft}`}
      {...props}
    />
  );
}

export default function FallDatenblattPage() {
  const { datei, meldungen, schreibgeschuetzt, ursprung, aendereDatei } = useFall();
  const [suche, setSuche] = useState("");
  const [gruppe, setGruppe] = useState("");

  const alle = useMemo(() => (datei ? felderAus(datei) : []), [datei]);
  const gruppen = useMemo(
    () => [...new Set(alle.map((f) => f.gruppe).filter(Boolean))],
    [alle]
  );
  const orte = useMemo(() => meldungenJeOrt(meldungen), [meldungen]);
  const obergrenze = datei ? strafeMaxName(datei) : "";

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return alle.filter((f) => {
      if (gruppe && f.gruppe !== gruppe) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.bezeichnung.toLowerCase().includes(q) ||
        f.quelle.toLowerCase().includes(q)
      );
    });
  }, [alle, gruppe, suche]);

  const quellen = useMemo(() => {
    const map = new Map<string, { herkunft: Herkunft; felder: string[] }>();
    for (const f of alle) {
      const key = f.quelle || "(ohne Quelle)";
      const eintrag = map.get(key) ?? { herkunft: f.herkunft, felder: [] };
      eintrag.felder.push(f.bezeichnung);
      map.set(key, eintrag);
    }
    return [...map.entries()];
  }, [alle]);

  const feldMeldungen = useMemo(
    () => meldungen.filter((m) => m.ort.startsWith("Feld ")),
    [meldungen]
  );

  if (!datei) return null;

  return (
    <>
      <header className="mb-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Datenblatt</h1>
            <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
              Alle Eingabefelder des Projekts mit Wert, Einheit, Herkunft, Quelle und Spanne.
            </p>
          </div>
          <FeldHinzufuegenDialog
            disabled={schreibgeschuetzt}
            onAnlegen={(feld) => aendereDatei((d) => neuesFeld(d, feld))}
          />
        </div>
        <Tabs defaultValue="felder">
          <TabsList aria-label="Ansichten Datenblatt">
            <TabsTrigger value="felder">Felder</TabsTrigger>
            <TabsTrigger value="quellen">Quellen</TabsTrigger>
            <TabsTrigger value="pruefmeldungen">
              Prüfmeldungen
              {feldMeldungen.length > 0 && (
                <span className="ml-1.5 rounded-full bg-secondary px-1.5 font-mono text-[11px]">
                  {feldMeldungen.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="felder" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3" role="search">
              <div className="grid gap-1.5">
                <Label htmlFor="datenblatt-suche">Suche</Label>
                <Input
                  id="datenblatt-suche"
                  type="search"
                  placeholder="Name oder Bezeichnung…"
                  value={suche}
                  onChange={(e) => setSuche(e.target.value)}
                  className="w-64"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="datenblatt-gruppe">Gruppe</Label>
                <Select
                  value={gruppe || "__alle__"}
                  onValueChange={(v) => setGruppe(!v || v === "__alle__" ? "" : v)}
                >
                  <SelectTrigger id="datenblatt-gruppe" aria-label="Gruppe" className="w-56">
                    <SelectValue>
                      {gruppe || "Alle Gruppen"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__alle__">Alle Gruppen</SelectItem>
                    {gruppen.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table aria-label="Felder des Falls" className="min-w-[72rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead className="text-right">Wert</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead>Herkunft</TableHead>
                    <TableHead className="min-w-[14rem]">Quelle</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Spanne</TableHead>
                    <TableHead className="whitespace-nowrap">Gruppe</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Löschen</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gefiltert.map((f) => {
                    const ort = `Feld ${f.bezeichnung}`;
                    const m = orte[ort] ?? [];
                    const warnung =
                      m.find((x) => x.text.toLowerCase().includes("spanne"))?.text ??
                      (m[0]?.stufe === "warnung" ? m[0].text : null);
                    return (
                      <TableRow
                        key={f.name}
                        data-ort={ort}
                        data-name={f.name}
                        className={cn(warnung && "bg-destructive/5")}
                      >
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {f.name}
                        </TableCell>
                        <TableCell className="max-w-[16rem] whitespace-normal">
                          {f.bezeichnung}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <WertZelleGekoppelt
                            feld={f}
                            disabled={schreibgeschuetzt}
                            warnung={warnung}
                            aufUnbegrenzt={f.name === obergrenze}
                            onCommit={(wert) =>
                              aendereDatei((d) => setzeFeldwert(d, f.name, wert, ursprung))
                            }
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {f.einheit || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <HerkunftBadge herkunft={f.herkunft} />
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="max-w-[14rem] whitespace-normal break-words text-sm text-muted-foreground">
                            {f.quelle || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                          {spanneText(f.spanne)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {f.gruppe || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={schreibgeschuetzt}
                            aria-label={`Feld ${f.name} löschen`}
                            onClick={() => aendereDatei((d) => loescheFeld(d, f.name))}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {gefiltert.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        Keine Felder für diese Filterung.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Herkunft: L Literatur, A Annahme, N Nutzerangabe. Ein geänderter Wert wechselt auf N;
              der ursprüngliche Wert bringt die ursprüngliche Herkunft zurück.
            </p>
          </TabsContent>

          <TabsContent value="quellen" className="mt-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table aria-label="Quellen der Felder">
                <TableHeader>
                  <TableRow>
                    <TableHead>Quelle</TableHead>
                    <TableHead>Herkunft</TableHead>
                    <TableHead>Felder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quellen.map(([quelle, info]) => (
                    <TableRow key={quelle}>
                      <TableCell>{quelle}</TableCell>
                      <TableCell>
                        <HerkunftBadge herkunft={info.herkunft} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {info.felder.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pruefmeldungen" className="mt-4">
            {feldMeldungen.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Prüfmeldungen zu Feldern.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {feldMeldungen.map((m, i) => (
                  <li key={`${m.ort}-${i}`} data-ort={m.ort}>
                    <span className="font-medium">{m.ort}:</span> {m.text}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </header>
    </>
  );
}
