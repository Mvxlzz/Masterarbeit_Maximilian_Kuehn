"use client";

import { useEffect, useMemo, useState } from "react";

import { SeitenKopf } from "@/components/szenarien/teile";
import { Input } from "@/components/ui/input";
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
import { ApiFehler, holeGlossar, type GlossarEintrag } from "@/lib/api";

/** Glossar: Begriffe wie in Kapitel 4 der Arbeit, in der Reihenfolge der Arbeit (GET /glossar). */
export default function GlossarPage() {
  const [eintraege, setEintraege] = useState<GlossarEintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [suche, setSuche] = useState("");

  useEffect(() => {
    let ab = false;
    holeGlossar()
      .then((g) => {
        if (!ab) setEintraege(g);
      })
      .catch((e) => {
        if (!ab) setFehler(e instanceof ApiFehler ? e.message : "Das Glossar ließ sich nicht laden.");
      });
    return () => {
      ab = true;
    };
  }, []);

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase();
    if (!eintraege || !s) return eintraege ?? [];
    return eintraege.filter((e) => `${e.begriff} ${e.erklaerung}`.toLowerCase().includes(s));
  }, [eintraege, suche]);

  return (
    <>
      <SeitenKopf titel="Glossar" abschnitt="Kapitel 4" text="Begriffe wie in Kapitel 4 der Arbeit." />
      {fehler && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {fehler}
        </div>
      )}
      <div className="mb-4 grid max-w-xs gap-1.5" role="search">
        <Label htmlFor="glossar-suche">Suche</Label>
        <Input
          id="glossar-suche"
          type="search"
          placeholder="Begriff oder Erklärung…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
        />
      </div>
      {!eintraege && !fehler && <Skeleton className="h-64 w-full max-w-[1040px]" />}
      {eintraege && (
        <div className="max-w-[1040px] overflow-hidden rounded-lg border border-border">
          <Table aria-label="Glossar" className="table-fixed">
            <colgroup>
              <col className="w-[14rem]" />
              <col />
              <col className="w-[6.5rem]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Begriff</TableHead>
                <TableHead>Erklärung</TableHead>
                <TableHead className="text-right">Abschnitt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gefiltert.map((e) => (
                <TableRow key={e.begriff} data-testid="glossar-zeile">
                  <TableCell className="align-top font-medium whitespace-normal">{e.begriff}</TableCell>
                  <TableCell className="align-top whitespace-normal text-muted-foreground">
                    <span className="block max-w-[80ch] leading-relaxed">{e.erklaerung}</span>
                  </TableCell>
                  <TableCell className="align-top text-right font-mono text-xs">{e.abschnitt}</TableCell>
                </TableRow>
              ))}
              {gefiltert.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    Kein Begriff passt zu „{suche.trim()}“.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
