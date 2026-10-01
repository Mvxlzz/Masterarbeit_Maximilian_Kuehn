"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useProjekte } from "@/components/projekte-provider";
import {
  ApiFehler,
  bewerten,
  pruefen,
  type FallDatei,
  type Meldung,
  type ModellErgebnis,
} from "@/lib/api";
import { fehlerVorhanden, type FeldUrsprung } from "@/lib/fall";
import { REFERENZ_ID } from "@/lib/projekte";

const DEBOUNCE_MS = 400;

type FallContextWert = {
  datei: FallDatei | null;
  meldungen: Meldung[];
  ergebnis: ModellErgebnis | null;
  aktuell: boolean;
  laedt: boolean;
  fehlerText: string | null;
  schreibgeschuetzt: boolean;
  ursprung: Record<string, FeldUrsprung>;
  aendereDatei: (fn: (d: FallDatei) => FallDatei) => void;
  setzeDateiDirekt: (datei: FallDatei) => void;
  kopieAnlegenUndBearbeiten: () => Promise<void>;
};

const FallContext = createContext<FallContextWert | null>(null);

export function useFall(): FallContextWert {
  const ctx = useContext(FallContext);
  if (!ctx) {
    throw new Error("useFall muss innerhalb von <FallProvider> aufgerufen werden.");
  }
  return ctx;
}

export function FallProvider({ children }: { children: ReactNode }) {
  const {
    offenesProjekt,
    ladeProjektdatei,
    aktualisiereDatei,
    aktualisiereErgebnis,
    duplizieren,
    oeffnen,
    bereit,
  } = useProjekte();

  const [datei, setDateiZustand] = useState<FallDatei | null>(null);
  // Aktueller Stand auch außerhalb des Renderns, damit Änderungen nacheinander aufbauen und
  // aktualisiereDatei (Zustand des ProjekteProviders) nicht während eines Updaters läuft
  const dateiRef = useRef<FallDatei | null>(null);
  const setDatei = useCallback((d: FallDatei | null) => {
    dateiRef.current = d;
    setDateiZustand(d);
  }, []);
  const [meldungen, setMeldungen] = useState<Meldung[]>([]);
  const [ergebnis, setErgebnis] = useState<ModellErgebnis | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehlerText, setFehlerText] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef = useRef(0);
  const projektId = offenesProjekt?.id ?? null;
  const schreibgeschuetzt = projektId === REFERENZ_ID;

  const ursprung = useMemo<Record<string, FeldUrsprung>>(
    () => (offenesProjekt?.ursprung as Record<string, FeldUrsprung>) ?? {},
    [offenesProjekt?.ursprung]
  );

  const pruefeUndBewerte = useCallback(
    async (d: FallDatei, id: string) => {
      const gen = ++genRef.current;
      setLaedt(true);
      setFehlerText(null);
      try {
        const m = await pruefen(d);
        if (gen !== genRef.current) return;
        setMeldungen(m);
        if (fehlerVorhanden(m)) {
          // Letzter gültiger Stand bleibt in ergebnis.
          return;
        }
        const e = await bewerten(d);
        if (gen !== genRef.current) return;
        setErgebnis(e);
        aktualisiereErgebnis(id, e);
      } catch (err) {
        if (gen !== genRef.current) return;
        setFehlerText(err instanceof ApiFehler ? err.message : "Prüfung fehlgeschlagen.");
      } finally {
        if (gen === genRef.current) setLaedt(false);
      }
    },
    [aktualisiereErgebnis]
  );

  // Projekt laden / wechseln
  useEffect(() => {
    if (!bereit || !projektId) {
      /* eslint-disable react-hooks/set-state-in-effect -- Reset beim Schließen des Projekts */
      setDatei(null);
      setMeldungen([]);
      setErgebnis(null);
      setFehlerText(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let abbruch = false;
    (async () => {
      try {
        const d = await ladeProjektdatei(projektId);
        if (abbruch) return;
        setDatei(d);
        await pruefeUndBewerte(d, projektId);
      } catch (err) {
        if (!abbruch) {
          setFehlerText(err instanceof ApiFehler ? err.message : "Datei konnte nicht geladen werden.");
        }
      }
    })();
    return () => {
      abbruch = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Nur bei Projektwechsel neu laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bereit, projektId]);

  const planePruefung = useCallback(
    (d: FallDatei, id: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void pruefeUndBewerte(d, id);
      }, DEBOUNCE_MS);
    },
    [pruefeUndBewerte]
  );

  const aendereDatei = useCallback(
    (fn: (d: FallDatei) => FallDatei) => {
      if (!projektId || schreibgeschuetzt) return;
      const aktuell = dateiRef.current;
      if (!aktuell) return;
      const neu = fn(aktuell);
      setDatei(neu);
      aktualisiereDatei(projektId, neu);
      planePruefung(neu, projektId);
    },
    [projektId, schreibgeschuetzt, aktualisiereDatei, planePruefung, setDatei]
  );

  const setzeDateiDirekt = useCallback(
    (d: FallDatei) => {
      if (!projektId || schreibgeschuetzt) return;
      setDatei(d);
      aktualisiereDatei(projektId, d);
      planePruefung(d, projektId);
    },
    [projektId, schreibgeschuetzt, aktualisiereDatei, planePruefung, setDatei]
  );

  const kopieAnlegenUndBearbeiten = useCallback(async () => {
    if (!projektId) return;
    // duplizieren lädt die Datei selbst, falls sie noch nicht im Zustand liegt.
    const kopie = await duplizieren(projektId);
    oeffnen(kopie.id);
  }, [projektId, duplizieren, oeffnen]);

  const aktuell = !fehlerVorhanden(meldungen);

  const wert = useMemo<FallContextWert>(
    () => ({
      datei,
      meldungen,
      ergebnis,
      aktuell,
      laedt,
      fehlerText,
      schreibgeschuetzt,
      ursprung,
      aendereDatei,
      setzeDateiDirekt,
      kopieAnlegenUndBearbeiten,
    }),
    [
      datei,
      meldungen,
      ergebnis,
      aktuell,
      laedt,
      fehlerText,
      schreibgeschuetzt,
      ursprung,
      aendereDatei,
      setzeDateiDirekt,
      kopieAnlegenUndBearbeiten,
    ]
  );

  return <FallContext.Provider value={wert}>{children}</FallContext.Provider>;
}
