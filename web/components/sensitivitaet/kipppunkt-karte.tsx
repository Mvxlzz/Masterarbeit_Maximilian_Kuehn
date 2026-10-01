"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BereichEingabe } from "@/components/sensitivitaet/bereich-eingabe";
import { KipppunktKarteAnsicht } from "@/components/sensitivitaet/kipppunkt-karte-ansicht";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ApiFehler,
  karte,
  tornado,
  type FallDatei,
  type KarteAntwort,
  type ModellErgebnis,
} from "@/lib/api";
import {
  groesseLabel,
  groesseText,
  groessenListe,
  nameAlternative,
  standardbereich,
} from "@/lib/sensitivitaet";

type Props = {
  datei: FallDatei;
  ergebnis: ModellErgebnis;
  szenario: string | null;
};

export function KipppunktKarteSektion({ datei, ergebnis, szenario }: Props) {
  const felder = useMemo(() => groessenListe(datei, false), [datei]);
  const [fx, setFx] = useState(felder[0] ?? "");
  const [fy, setFy] = useState(felder[1] ?? "");
  const [vorschlagGeladen, setVorschlagGeladen] = useState(false);
  const [bx, setBx] = useState<[number, number] | null>(null);
  const [by, setBy] = useState<[number, number] | null>(null);
  const [raster, setRaster] = useState(35);
  const [daten, setDaten] = useState<KarteAntwort | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  const onBx = useCallback((b: [number, number] | null) => setBx(b), []);
  const onBy = useCallback((b: [number, number] | null) => setBy(b), []);

  // Vorschlag: zwei oberste Tornado-Größen
  useEffect(() => {
    if (vorschlagGeladen || felder.length < 2) return;
    let abbruch = false;
    (async () => {
      try {
        const a = ergebnis.rangfolge[0];
        const b = ergebnis.rangfolge[1];
        if (!a || !b) return;
        const t = await tornado(datei, a, b, szenario);
        if (abbruch) return;
        const tops = t.zeilen
          .map((z) => z.feld)
          .filter((f) => felder.includes(f))
          .slice(0, 2);
        if (tops.length >= 2) {
          setFx(tops[0]);
          setFy(tops[1]);
        }
      } catch {
        // Standard bleibt felder[0]/[1]
      } finally {
        if (!abbruch) setVorschlagGeladen(true);
      }
    })();
    return () => {
      abbruch = true;
    };
  }, [datei, ergebnis.rangfolge, felder, szenario, vorschlagGeladen]);

  const vorschlagX = useMemo(
    () => (fx ? standardbereich(datei, fx) : ([0, 1] as [number, number])),
    [datei, fx]
  );
  const vorschlagY = useMemo(
    () => (fy ? standardbereich(datei, fy) : ([0, 1] as [number, number])),
    [datei, fy]
  );

  useEffect(() => {
    let abbruch = false;
    if (!fx || !fy || !bx || !by || fx === fy) {
      return () => {
        abbruch = true;
      };
    }
    const t = window.setTimeout(async () => {
      setLaedt(true);
      setFehler("");
      try {
        const antwort = await karte(
          datei,
          fx,
          bx[0],
          bx[1],
          fy,
          by[0],
          by[1],
          raster,
          szenario
        );
        if (!abbruch) setDaten(antwort);
      } catch (e) {
        if (!abbruch) {
          setDaten(null);
          setFehler(e instanceof ApiFehler ? e.message : "Karte konnte nicht berechnet werden.");
        }
      } finally {
        if (!abbruch) setLaedt(false);
      }
    }, 300);
    return () => {
      abbruch = true;
      window.clearTimeout(t);
    };
  }, [datei, fx, fy, bx, by, raster, szenario]);

  const tx = groesseText(datei, fx);
  const ty = groesseText(datei, fy);

  const vorn = useMemo(() => {
    if (!daten) return [];
    const alle = [...new Set(daten.karte.flat().filter(Boolean))] as string[];
    return alle.filter((s) => daten.karte.some((zeile) => zeile.includes(s)));
  }, [daten]);

  if (felder.length < 2) {
    return (
      <section id="karte" className="scroll-mt-4">
        <h2 className="mb-1 text-lg font-medium">Kipppunkt-Karte</h2>
        <p className="text-sm text-muted-foreground">
          Die Karte braucht mindestens zwei Felder im Datenblatt.
        </p>
      </section>
    );
  }

  const restY = felder.filter((f) => f !== fx);

  return (
    <section id="karte" className="scroll-mt-4 rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 text-lg font-medium">Kipppunkt-Karte</h2>
      <p className="mb-3 max-w-[72ch] text-sm text-muted-foreground blocksatz">
        Zwei Eingaben werden zugleich variiert. Jede Zelle zeigt, welche Alternative dort auf Rang 1
        liegt. So werden Wechselwirkungen sichtbar, die die Einparameter-Variation nicht erfasst.
      </p>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Feld auf der x-Achse</span>
            <Select value={fx} onValueChange={(v) => v && setFx(v)}>
              <SelectTrigger className="min-w-[200px]" aria-label="Feld auf der x-Achse">
                <SelectValue placeholder="Feld x">
                  {fx ? groesseLabel(datei, fx) : "Feld wählen"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {felder.map((f) => (
                  <SelectItem key={f} value={f}>
                    {groesseLabel(datei, f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fx && (
            <BereichEingabe
              key={`x-${fx}-${vorschlagX[0]}-${vorschlagX[1]}`}
              id="karte-x"
              einheit={tx.einheit}
              vorschlag={vorschlagX}
              onGueltig={onBx}
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Feld auf der y-Achse</span>
            <Select value={fy} onValueChange={(v) => v && setFy(v)}>
              <SelectTrigger className="min-w-[200px]" aria-label="Feld auf der y-Achse">
                <SelectValue placeholder="Feld y">
                  {fy ? groesseLabel(datei, fy) : "Feld wählen"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {restY.map((f) => (
                  <SelectItem key={f} value={f}>
                    {groesseLabel(datei, f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fy && (
            <BereichEingabe
              key={`y-${fy}-${vorschlagY[0]}-${vorschlagY[1]}`}
              id="karte-y"
              einheit={ty.einheit}
              vorschlag={vorschlagY}
              onGueltig={onBy}
            />
          )}
        </div>
      </div>

      <div className="mb-4 max-w-xs">
        <Label htmlFor="karte-raster" className="mb-2">
          Rasterweite (Punkte je Achse): {raster}
        </Label>
        <input
          id="karte-raster"
          type="range"
          min={30}
          max={40}
          step={1}
          value={raster}
          aria-label={`Rasterweite ${raster} Punkte je Achse`}
          onChange={(e) => setRaster(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primaer)]"
        />
      </div>

      {fehler && (
        <p className="mb-3 text-sm text-[var(--status-ausschluss-fg)]" role="alert">
          {fehler}
        </p>
      )}

      {laedt && !daten && <Skeleton className="mb-3 h-80 w-full" />}

      {daten && (
        <p className="mb-3 text-sm">
          {vorn.length > 1
            ? `Auf Rang 1 liegen im Raster: ${vorn.map((s) => nameAlternative(datei, s)).join(", ")}.`
            : vorn.length === 1
              ? `Im ganzen Raster liegt ${nameAlternative(datei, vorn[0])} auf Rang 1.`
              : "Keine Alternative ist zulässig."}
        </p>
      )}

      {daten && (
        <Tabs defaultValue="diagramm">
          <TabsList>
            <TabsTrigger value="diagramm">Diagramm</TabsTrigger>
            <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
          </TabsList>
          <TabsContent value="diagramm" className="mt-3 overflow-x-auto">
            <KipppunktKarteAnsicht
              datei={datei}
              daten={daten}
              feldX={fx}
              feldY={fy}
              refX={ergebnis.werte[fx]}
              refY={ergebnis.werte[fy]}
              modus="diagramm"
            />
          </TabsContent>
          <TabsContent value="tabelle" className="mt-3 overflow-x-auto">
            <KipppunktKarteAnsicht
              datei={datei}
              daten={daten}
              feldX={fx}
              feldY={fy}
              modus="tabelle"
            />
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
