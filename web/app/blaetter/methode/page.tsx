"use client";

import { useEffect, useState } from "react";

import { FormelKarte } from "@/components/einfuehrung/bausteine";
import { SeitenKopf } from "@/components/szenarien/teile";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiFehler, holeFormeln, type MethodenFormel } from "@/lib/api";

/** Formeln der Methode (Wortlaut aus Kapitel 4, GET /formeln). Fest, der Baukasten ändert sie nicht. */
export default function MethodePage() {
  const [formeln, setFormeln] = useState<MethodenFormel[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let ab = false;
    holeFormeln()
      .then((f) => {
        if (!ab) setFormeln(f);
      })
      .catch((e) => {
        if (!ab) setFehler(e instanceof ApiFehler ? e.message : "Die Formeln ließen sich nicht laden.");
      });
    return () => {
      ab = true;
    };
  }, []);

  return (
    <>
      <SeitenKopf
        titel="Formeln der Methode"
        abschnitt="Formeln (5), (6), (8) bis (13)"
        text="Diese Formeln sind fest. Der Baukasten ändert Felder, Hilfsgrößen und Positionen, nicht die Methode. Die Formelzeichen folgen Kapitel 4."
      />
      {fehler && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {fehler}
        </div>
      )}
      {!formeln && !fehler && (
        <div className="grid max-w-[1040px] gap-4" aria-busy="true" aria-label="Formeln werden geladen">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}
      {formeln && (
        <div className="grid max-w-[1040px] gap-4" data-testid="methode-formeln">
          {formeln.map((f) => (
            <FormelKarte
              key={f.nummer}
              formel={{
                titel: f.titel,
                nummer: f.nummer,
                abschnitt: `Abschnitt ${f.abschnitt}`,
                allgemein: f.latex,
                eingesetzt: "",
                ergebnis: "",
                erklaerung: f.hinweis,
                zeichen: f.zeichen,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
