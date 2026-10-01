"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eingabe, lesen } from "@/lib/format";

type Props = {
  id: string;
  einheit: string;
  vorschlag: [number, number];
  onGueltig: (bereich: [number, number] | null) => void;
};

/**
 * Zwei Eingaben „von“ und „bis“ im deutschen Format.
 * Ruft onGueltig(null) bei ungültiger Eingabe, sonst [von, bis].
 * Schlüssel `vorschlag` setzt die Felder über Remount (key am Parent).
 */
export function BereichEingabe({ id, einheit, vorschlag, onGueltig }: Props) {
  const [vonText, setVonText] = useState(() => eingabe(vorschlag[0]));
  const [bisText, setBisText] = useState(() => eingabe(vorschlag[1]));
  const reactId = useId();

  const { fehler, bereich } = useMemo(() => {
    try {
      const von = lesen(vonText);
      const bis = lesen(bisText);
      if (von >= bis) {
        return { fehler: "„von“ muss kleiner als „bis“ sein.", bereich: null as [number, number] | null };
      }
      return { fehler: "", bereich: [von, bis] as [number, number] };
    } catch (e) {
      return {
        fehler: e instanceof Error ? e.message : "Ungültige Zahl.",
        bereich: null as [number, number] | null,
      };
    }
  }, [vonText, bisText]);

  useEffect(() => {
    onGueltig(bereich);
  }, [bereich, onGueltig]);

  const zusatz = einheit && einheit !== "—" ? ` [${einheit}]` : "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-${reactId}-von`}>von{zusatz}</Label>
          <Input
            id={`${id}-${reactId}-von`}
            value={vonText}
            onChange={(e) => setVonText(e.target.value)}
            className="w-28"
            inputMode="decimal"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-${reactId}-bis`}>bis{zusatz}</Label>
          <Input
            id={`${id}-${reactId}-bis`}
            value={bisText}
            onChange={(e) => setBisText(e.target.value)}
            className="w-28"
            inputMode="decimal"
          />
        </div>
      </div>
      {fehler && (
        <p className="text-sm text-[var(--status-warnung-fg)]" role="alert">
          {fehler}
        </p>
      )}
    </div>
  );
}
