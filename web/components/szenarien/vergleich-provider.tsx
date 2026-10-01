"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useFall } from "@/components/fall/fall-provider";
import { ApiFehler, szenarienVergleich, type SzenarioVergleich } from "@/lib/api";

type VergleichWert = {
  /** Basisfall und alle Szenarien aus /szenarien, letzter gültiger Stand. */
  vergleich: SzenarioVergleich[] | null;
  laedt: boolean;
  fehler: string | null;
};

const VergleichContext = createContext<VergleichWert | null>(null);

export function useVergleich(): VergleichWert {
  const ctx = useContext(VergleichContext);
  if (!ctx) throw new Error("useVergleich muss innerhalb von <VergleichProvider> stehen.");
  return ctx;
}

/**
 * Holt den Szenariovergleich (kern.modell.vergleich_szenarien über POST /szenarien), sobald der
 * FallProvider eine gültige Bewertung hat. Bei Prüffehlern bleibt der letzte gültige Vergleich stehen.
 */
export function VergleichProvider({ children }: { children: ReactNode }) {
  const { datei, ergebnis, aktuell } = useFall();
  const [vergleich, setVergleich] = useState<SzenarioVergleich[] | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!datei || !ergebnis || !aktuell) return;
    let abbruch = false;
    /* eslint-disable react-hooks/set-state-in-effect -- Ladezustand beim neuen gültigen Stand */
    setLaedt(true);
    setFehler(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    szenarienVergleich(datei)
      .then((v) => {
        if (!abbruch) setVergleich(v);
      })
      .catch((e) => {
        if (!abbruch) setFehler(e instanceof ApiFehler ? e.message : "Der Vergleich ist fehlgeschlagen.");
      })
      .finally(() => {
        if (!abbruch) setLaedt(false);
      });
    return () => {
      abbruch = true;
    };
    // Nur bei neuem gültigem Ergebnis (nach /pruefen und /bewerten) neu holen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ergebnis]);

  const wert = useMemo(() => ({ vergleich, laedt, fehler }), [vergleich, laedt, fehler]);
  return <VergleichContext.Provider value={wert}>{children}</VergleichContext.Provider>;
}
