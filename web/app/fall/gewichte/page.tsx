"use client";

import { useEffect, useMemo, useState } from "react";

import { useFall } from "@/components/fall/fall-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ApiFehler,
  gewichteDimension,
  gewichteKostensatz,
  holeKatalog,
} from "@/lib/api";
import { eingabe, lesen, mitEinheit } from "@/lib/format";
import {
  GEWICHT_TEXT,
  ergebnisseAusRechenweg,
  gewichte as gewichteAus,
  meldungenJeOrt,
  setzeGewichte,
  setzeUnterkriteriumGewicht,
  unterkriterien as ukAus,
  type Gewichte,
} from "@/lib/fall";
import { cn } from "@/lib/utils";

const DIMS = ["tech", "oekon", "oekol"] as const;

function profileGleich(
  a: Record<string, number> | undefined,
  b: Gewichte
): boolean {
  if (!a) return false;
  return DIMS.every((d) => Math.abs((a[d] ?? 0) - b[d]) < 1e-9);
}

export default function FallGewichtePage() {
  const {
    datei,
    meldungen,
    ergebnis,
    aktuell,
    schreibgeschuetzt,
    aendereDatei,
    setzeDateiDirekt,
  } = useFall();
  const [profile, setProfile] = useState<Record<string, Record<string, number>>>({});
  const [ausgleichen, setAusgleichen] = useState(true);
  const [kostensatzText, setKostensatzText] = useState("350");
  const [kostensatzFehler, setKostensatzFehler] = useState<string | null>(null);
  const [lokalFehler, setLokalFehler] = useState<string | null>(null);

  useEffect(() => {
    let abbruch = false;
    holeKatalog()
      .then((k) => {
        if (!abbruch) setProfile(k.gewichtsprofile);
      })
      .catch(() => {
        /* Fallback: nur „Gleich“ lokal – Katalog bleibt optional für Offline. */
        if (!abbruch) {
          setProfile({
            Gleich: { tech: 1 / 3, oekon: 1 / 3, oekol: 1 / 3 },
          });
        }
      });
    return () => {
      abbruch = true;
    };
  }, []);

  const g = useMemo(() => (datei ? gewichteAus(datei) : null), [datei]);
  const uks = useMemo(() => (datei ? ukAus(datei) : []), [datei]);
  const orte = useMemo(() => meldungenJeOrt(meldungen), [meldungen]);
  const gewichteMeldungen = orte["Gewichte"] ?? [];
  const dimFehler = gewichteMeldungen
    .filter((m) => m.text.includes("Dimensionen"))
    .map((m) => m.text);
  const ukFehler = gewichteMeldungen
    .filter((m) => m.text.includes("Unterkriterien"))
    .map((m) => m.text);

  const rate = useMemo(() => {
    if (!aktuell || !ergebnis) return null;
    return ergebnisseAusRechenweg(ergebnis.rechenweg).austauschrate;
  }, [aktuell, ergebnis]);

  async function dimensionsgewichtSetzen(dim: (typeof DIMS)[number], wert: number) {
    if (!datei || !g || schreibgeschuetzt) return;
    setLokalFehler(null);
    if (wert < 0 || wert > 1) {
      setLokalFehler("Ein Gewicht liegt zwischen 0 und 1.");
      return;
    }
    if (ausgleichen && wert < 1) {
      try {
        const r = await gewichteDimension(g, dim, wert);
        aendereDatei((d) =>
          setzeGewichte(d, {
            tech: r.gewichte.tech,
            oekon: r.gewichte.oekon,
            oekol: r.gewichte.oekol,
          })
        );
      } catch (e) {
        setLokalFehler(e instanceof ApiFehler ? e.message : "Gewicht konnte nicht gesetzt werden.");
      }
      return;
    }
    aendereDatei((d) => setzeGewichte(d, { ...g, [dim]: wert }));
  }

  async function ausKostensatz() {
    if (!datei || schreibgeschuetzt) return;
    setKostensatzFehler(null);
    try {
      const eur = lesen(kostensatzText);
      if (eur < 0) {
        setKostensatzFehler("Der Kostensatz muss mindestens 0 sein.");
        return;
      }
      const r = await gewichteKostensatz(datei, eur);
      setzeDateiDirekt(
        setzeGewichte(datei, {
          tech: r.gewichte.tech,
          oekon: r.gewichte.oekon,
          oekol: r.gewichte.oekol,
        })
      );
    } catch (e) {
      setKostensatzFehler(
        e instanceof ApiFehler
          ? e.message
          : e instanceof Error
            ? e.message
            : "Kostensatz konnte nicht umgerechnet werden."
      );
    }
  }

  if (!datei || !g) return null;

  return (
    <>
      <header className="mb-6">
        <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Gewichte</h1>
        <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
          Dimensions- und Unterkriteriengewichte, Voreinstellungen und implizite Austauschrate.
        </p>
      </header>

      <section className="mb-8" aria-labelledby="dim-titel">
        <h2 id="dim-titel" className="mb-3 text-lg font-medium">
          Gewichte der drei Dimensionen
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">Voreinstellungen:</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(profile).map(([name, werte]) => {
            const aktiv = profileGleich(werte, g);
            return (
              <Button
                key={name}
                type="button"
                size="sm"
                variant={aktiv ? "default" : "outline"}
                disabled={schreibgeschuetzt}
                aria-pressed={aktiv}
                onClick={() =>
                  aendereDatei((d) =>
                    setzeGewichte(d, {
                      tech: werte.tech,
                      oekon: werte.oekon,
                      oekol: werte.oekol,
                    })
                  )
                }
                title={`${eingabe(werte.tech)} / ${eingabe(werte.oekon)} / ${eingabe(werte.oekol)}`}
              >
                {name}
              </Button>
            );
          })}
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Switch
            id="gewichte-ausgleichen"
            checked={ausgleichen}
            disabled={schreibgeschuetzt}
            onCheckedChange={(c) => setAusgleichen(c)}
          />
          <Label htmlFor="gewichte-ausgleichen" className="text-sm font-normal">
            Beim Ändern eines Gewichts die übrigen im bisherigen Verhältnis anpassen
          </Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {DIMS.map((dim) => (
            <div key={dim} className="grid gap-1.5">
              <Label htmlFor={`gewicht-${dim}`}>{GEWICHT_TEXT[dim]} [Anteil]</Label>
              <Input
                id={`gewicht-${dim}`}
                className="font-mono text-right"
                defaultValue={eingabe(g[dim])}
                key={`${dim}:${g[dim]}`}
                disabled={schreibgeschuetzt}
                aria-label={GEWICHT_TEXT[dim]}
                onBlur={(e) => {
                  try {
                    const w = lesen(e.target.value);
                    void dimensionsgewichtSetzen(dim, w);
                  } catch (err) {
                    setLokalFehler(err instanceof Error ? err.message : "Keine Zahl.");
                    e.target.value = eingabe(g[dim]);
                  }
                }}
              />
            </div>
          ))}
        </div>
        <p
          className={cn(
            "mt-2 text-sm",
            dimFehler.length > 0 ? "text-destructive" : "text-muted-foreground"
          )}
          role="status"
        >
          {dimFehler.length > 0
            ? dimFehler.join(" ")
            : "Summe 1"}
        </p>
        {lokalFehler && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {lokalFehler}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="kostensatz">CO₂-Kostensatz [€ je t CO₂-Äq]</Label>
            <Input
              id="kostensatz"
              value={kostensatzText}
              disabled={schreibgeschuetzt}
              className="w-40 font-mono text-right"
              onChange={(e) => {
                setKostensatzText(e.target.value);
                setKostensatzFehler(null);
              }}
            />
          </div>
          <Button
            type="button"
            disabled={schreibgeschuetzt || !aktuell}
            onClick={() => void ausKostensatz()}
          >
            Gewichte aus Kostensatz
          </Button>
        </div>
        {kostensatzFehler && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {kostensatzFehler}
          </p>
        )}
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">Implizite Austauschrate: </span>
          <strong>
            {rate === null ? "—" : mitEinheit(rate, "€ je t CO₂-Äq", 0)}
          </strong>
        </p>
        <p className="mt-1 max-w-[68ch] text-xs text-muted-foreground blocksatz">
          So viel Euro Mehrkosten gleicht eine Tonne weniger Treibhauspotenzial im Gesamtnutzwert
          aus. Die Rate folgt aus den Gewichten und den Kosten- und CO₂-Spannen der zulässigen
          Alternativen.
        </p>
      </section>

      <section aria-labelledby="uk-titel">
        <h2 id="uk-titel" className="mb-3 text-lg font-medium">
          Gewichte der technischen Unterkriterien
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {uks.map((u) => (
            <div key={u.schluessel} className="grid gap-1.5">
              <Label htmlFor={`uk-${u.schluessel}`}>{u.name} [Anteil]</Label>
              <Input
                id={`uk-${u.schluessel}`}
                className="font-mono text-right"
                defaultValue={eingabe(u.gewicht)}
                key={`${u.schluessel}:${u.gewicht}`}
                disabled={schreibgeschuetzt}
                aria-label={u.name}
                onBlur={(e) => {
                  try {
                    const w = lesen(e.target.value);
                    if (w < 0 || w > 1) {
                      setLokalFehler("Ein Gewicht liegt zwischen 0 und 1.");
                      e.target.value = eingabe(u.gewicht);
                      return;
                    }
                    aendereDatei((d) => setzeUnterkriteriumGewicht(d, u.schluessel, w));
                  } catch (err) {
                    setLokalFehler(err instanceof Error ? err.message : "Keine Zahl.");
                    e.target.value = eingabe(u.gewicht);
                  }
                }}
              />
            </div>
          ))}
        </div>
        <p
          className={cn(
            "mt-2 text-sm",
            ukFehler.length > 0 ? "text-destructive" : "text-muted-foreground"
          )}
          role="status"
        >
          {ukFehler.length > 0 ? ukFehler.join(" ") : "Summe 1"}
        </p>
      </section>
    </>
  );
}
