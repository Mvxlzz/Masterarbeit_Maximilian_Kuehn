"use client";

import { AltMarkierung, AlternativenLegende } from "@/components/sensitivitaet/alternativen-legende";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FallDatei, KarteAntwort } from "@/lib/api";
import { zahl } from "@/lib/format";
import {
  alternativenAusDatei,
  farbeAlternative,
  groesseText,
  nameAlternative,
} from "@/lib/sensitivitaet";

const BREITE = 560;
const HOEHE = 360;
const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 40;

type Props = {
  datei: FallDatei;
  daten: KarteAntwort;
  feldX: string;
  feldY: string;
  refX?: number;
  refY?: number;
  modus?: "diagramm" | "tabelle";
};

/** Reine Anzeige der Kipppunkt-Karte (Sieger nur aus API-Daten). */
export function KipppunktKarteAnsicht({
  datei,
  daten,
  feldX,
  feldY,
  refX,
  refY,
  modus = "diagramm",
}: Props) {
  const tx = groesseText(datei, feldX);
  const ty = groesseText(datei, feldY);
  const alle = [...new Set(daten.karte.flat().filter(Boolean))] as string[];
  const nX = daten.xs.length;
  const nY = daten.ys.length;
  const cellW = (BREITE - PAD_L - PAD_R) / Math.max(nX, 1);
  const cellH = (HOEHE - PAD_T - PAD_B) / Math.max(nY, 1);

  if (modus === "tabelle") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {ty.text} \ {tx.text}
            </TableHead>
            {daten.xs.map((x) => (
              <TableHead key={x} className="text-center font-mono text-xs">
                {zahl(x)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {daten.ys.map((y, i) => (
            <TableRow key={y}>
              <TableCell className="font-mono text-xs">{zahl(y)}</TableCell>
              {daten.xs.map((x, j) => {
                const s = daten.karte[i]?.[j];
                return (
                  <TableCell
                    key={j}
                    className="text-center text-xs"
                    data-x={x}
                    data-y={y}
                    data-sieger={s ?? ""}
                  >
                    {s ? nameAlternative(datei, s) : "—"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  let refKreuz: { px: number; py: number } | null = null;
  if (
    refX !== undefined &&
    refY !== undefined &&
    nX >= 2 &&
    nY >= 2
  ) {
    const x0 = daten.xs[0];
    const x1 = daten.xs[nX - 1];
    const y0 = daten.ys[0];
    const y1 = daten.ys[nY - 1];
    refKreuz = {
      px: PAD_L + ((refX - x0) / (x1 - x0)) * (BREITE - PAD_L - PAD_R),
      py: PAD_T + ((refY - y0) / (y1 - y0)) * (HOEHE - PAD_T - PAD_B),
    };
  }

  return (
    <div>
      <svg
        width={BREITE}
        height={HOEHE}
        role="img"
        aria-label={`Kipppunkt-Karte Rang 1 über ${tx.text} und ${ty.text}`}
        className="max-w-full"
      >
        {daten.ys.map((y, i) =>
          daten.xs.map((x, j) => {
            const sieger = daten.karte[i]?.[j] ?? null;
            const px = PAD_L + j * cellW;
            const py = PAD_T + i * cellH;
            return (
              <g key={`${i}-${j}`}>
                <rect
                  x={px}
                  y={py}
                  width={cellW}
                  height={cellH}
                  fill={farbeAlternative(sieger, alle)}
                  fillOpacity={0.85}
                  stroke="var(--linie)"
                  strokeWidth={0.5}
                  data-x={x}
                  data-y={y}
                  data-sieger={sieger ?? ""}
                >
                  <title>
                    {`${tx.text} ${zahl(x)}, ${ty.text} ${zahl(y)}: ${
                      sieger ? nameAlternative(datei, sieger) : "—"
                    }`}
                  </title>
                </rect>
                {sieger && Math.min(cellW, cellH) >= 14 && (
                  <AltMarkierung
                    schluessel={sieger}
                    x={px + cellW / 2}
                    y={py + cellH / 2}
                    size={Math.min(10, cellW * 0.4, cellH * 0.4)}
                    alle={alle}
                  />
                )}
              </g>
            );
          })
        )}
        {refKreuz && (
          <g aria-hidden="true">
            <line
              x1={refKreuz.px - 8}
              y1={refKreuz.py}
              x2={refKreuz.px + 8}
              y2={refKreuz.py}
              stroke="var(--markierung)"
              strokeWidth={1.5}
            />
            <line
              x1={refKreuz.px}
              y1={refKreuz.py - 8}
              x2={refKreuz.px}
              y2={refKreuz.py + 8}
              stroke="var(--markierung)"
              strokeWidth={1.5}
            />
          </g>
        )}
        {[0, Math.floor(nX / 2), nX - 1].map((j) => (
          <text
            key={`x-${j}`}
            x={PAD_L + j * cellW + cellW / 2}
            y={HOEHE - 12}
            textAnchor="middle"
            fontSize={10}
            fill="var(--text-gedaempft)"
          >
            {zahl(daten.xs[j])}
          </text>
        ))}
        {[0, Math.floor(nY / 2), nY - 1].map((i) => (
          <text
            key={`y-${i}`}
            x={PAD_L - 6}
            y={PAD_T + i * cellH + cellH / 2 + 3}
            textAnchor="end"
            fontSize={10}
            fill="var(--text-gedaempft)"
          >
            {zahl(daten.ys[i])}
          </text>
        ))}
      </svg>
      <div className="mt-2">
        <AlternativenLegende alternativen={alternativenAusDatei(datei)} />
      </div>
    </div>
  );
}
