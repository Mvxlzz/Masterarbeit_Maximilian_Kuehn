"use client";

import { useEffect, useMemo, useState } from "react";

import { AltMarkierung, AlternativenLegende } from "@/components/sensitivitaet/alternativen-legende";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  ApiFehler,
  dreieck,
  type DreieckAntwort,
  type FallDatei,
  type ModellErgebnis,
} from "@/lib/api";
import { punkte, zahl } from "@/lib/format";
import {
  alternativenAusDatei,
  baryzentrisch,
  nameAlternative,
} from "@/lib/sensitivitaet";

type Props = {
  datei: FallDatei;
  ergebnis: ModellErgebnis;
  szenario: string | null;
};

const BREITE = 420;
const HOEHE = 380;
const PAD = 36;

export function GewichtsdreieckSektion({ datei, ergebnis, szenario }: Props) {
  const [schritte, setSchritte] = useState(30);
  const [daten, setDaten] = useState<DreieckAntwort | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    let abbruch = false;
    const t = window.setTimeout(async () => {
      setLaedt(true);
      setFehler("");
      try {
        const antwort = await dreieck(datei, schritte, szenario);
        if (!abbruch) setDaten(antwort);
      } catch (e) {
        if (!abbruch) {
          setDaten(null);
          setFehler(
            e instanceof ApiFehler ? e.message : "Gewichtsdreieck konnte nicht berechnet werden."
          );
        }
      } finally {
        if (!abbruch) setLaedt(false);
      }
    }, 300);
    return () => {
      abbruch = true;
      window.clearTimeout(t);
    };
  }, [datei, schritte, szenario]);

  const alle = useMemo(
    () =>
      daten
        ? [...new Set(daten.punkte.map((p) => p.rang_1).filter(Boolean))] as string[]
        : ergebnis.alternativen,
    [daten, ergebnis.alternativen]
  );

  const punktePos = useMemo(() => {
    if (!daten) return [];
    return daten.punkte.map((p) => {
      const { x, y } = baryzentrisch(p.w_tech, p.w_oekon, p.w_oekol, BREITE, HOEHE, PAD);
      return { ...p, x, y };
    });
  }, [daten]);

  const kreuz = useMemo(() => {
    const g = ergebnis.gewichte;
    const t = g.tech ?? g.w_tech;
    const o = g.oekon ?? g.w_oekon;
    const e = g.oekol ?? g.w_oekol;
    if (t === undefined || o === undefined || e === undefined) return null;
    return baryzentrisch(t, o, e, BREITE, HOEHE, PAD);
  }, [ergebnis.gewichte]);

  const ecken = useMemo(() => {
    const top = baryzentrisch(1, 0, 0, BREITE, HOEHE, PAD);
    const bl = baryzentrisch(0, 0, 1, BREITE, HOEHE, PAD);
    const br = baryzentrisch(0, 1, 0, BREITE, HOEHE, PAD);
    return { top, bl, br };
  }, []);

  const vorn = useMemo(() => {
    if (!daten) return [];
    return alle.filter((s) =>
      daten.punkte.some((p) => p.rang_1 === s && p.abstand !== 0)
    );
  }, [daten, alle]);

  return (
    <section id="dreieck" className="scroll-mt-4 rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 text-lg font-medium">Gewichtsdreieck</h2>
      <p className="mb-3 max-w-[72ch] text-sm text-muted-foreground blocksatz">
        Jeder Punkt ist eine Gewichtung mit w_tech + w_ökon + w_ökol = 1, eingefärbt nach der
        Alternative auf Rang 1. Ein offener Kreis heißt Gleichstand auf Rang 1. Das Kreuz markiert
        die Gewichte des Falls. Alle übrigen Eingaben bleiben unverändert.
      </p>

      <div className="mb-4 max-w-xs">
        <Label htmlFor="dreieck-schritte" className="mb-2">
          Schritte je Achse: {schritte}
          <span className="ml-1 font-normal text-muted-foreground">
            (Gewichte in Stufen von 1/{schritte})
          </span>
        </Label>
        <input
          id="dreieck-schritte"
          type="range"
          min={10}
          max={50}
          step={5}
          value={schritte}
          aria-label={`Schritte je Achse ${schritte}`}
          onChange={(e) => setSchritte(Number(e.target.value))}
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
          Auf Rang 1 liegen je nach Gewichtung:{" "}
          {vorn.length
            ? vorn.map((s) => nameAlternative(datei, s)).join(", ")
            : "—"}
          .
        </p>
      )}

      {daten && (
        <Tabs defaultValue="diagramm">
          <TabsList>
            <TabsTrigger value="diagramm">Diagramm</TabsTrigger>
            <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
          </TabsList>
          <TabsContent value="diagramm" className="mt-3 overflow-x-auto">
            <svg
              width={BREITE}
              height={HOEHE}
              role="img"
              aria-label="Gewichtsdreieck: Rang 1 je Dimensionsgewichtung"
              className="max-w-full"
            >
              <polygon
                points={`${ecken.top.x},${ecken.top.y} ${ecken.br.x},${ecken.br.y} ${ecken.bl.x},${ecken.bl.y}`}
                fill="var(--flaeche-zweit)"
                stroke="var(--linie)"
                strokeWidth={1.5}
              />
              {punktePos.map((p, idx) => (
                <g key={idx}>
                  <title>
                    {`w_tech=${zahl(p.w_tech, 3)}, w_ökon=${zahl(p.w_oekon, 3)}, w_ökol=${zahl(p.w_oekol, 3)}: ${
                      p.rang_1 ? nameAlternative(datei, p.rang_1) : "—"
                    }`}
                  </title>
                  <AltMarkierung
                    schluessel={p.rang_1}
                    x={p.x}
                    y={p.y}
                    size={p.abstand === 0 ? 9 : 7}
                    offen={p.abstand === 0}
                    alle={alle}
                  />
                </g>
              ))}
              {kreuz && (
                <g aria-hidden="true">
                  <line
                    x1={kreuz.x - 7}
                    y1={kreuz.y}
                    x2={kreuz.x + 7}
                    y2={kreuz.y}
                    stroke="var(--markierung)"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={kreuz.x}
                    y1={kreuz.y - 7}
                    x2={kreuz.x}
                    y2={kreuz.y + 7}
                    stroke="var(--markierung)"
                    strokeWidth={1.5}
                  />
                </g>
              )}
              <text
                x={ecken.top.x}
                y={ecken.top.y - 10}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-gedaempft)"
              >
                technisch
              </text>
              <text
                x={ecken.bl.x}
                y={ecken.bl.y + 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-gedaempft)"
              >
                ökologisch
              </text>
              <text
                x={ecken.br.x}
                y={ecken.br.y + 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-gedaempft)"
              >
                ökonomisch
              </text>
            </svg>
            <div className="mt-2">
              <AlternativenLegende alternativen={alternativenAusDatei(datei)} />
            </div>
          </TabsContent>
          <TabsContent value="tabelle" className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">w_tech</TableHead>
                  <TableHead className="text-right">w_ökon</TableHead>
                  <TableHead className="text-right">w_ökol</TableHead>
                  <TableHead>Rang 1</TableHead>
                  <TableHead className="text-right">Abstand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daten.punkte.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-right font-mono text-xs">
                      {zahl(p.w_tech, 3)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {zahl(p.w_oekon, 3)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {zahl(p.w_oekol, 3)}
                    </TableCell>
                    <TableCell>
                      {p.rang_1 ? nameAlternative(datei, p.rang_1) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {p.abstand === null ? "—" : punkte(p.abstand)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
