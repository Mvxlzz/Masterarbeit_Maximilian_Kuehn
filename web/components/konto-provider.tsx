"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import * as konto from "@/lib/konto";

type KontoWert = {
  /** Beide Variablen gesetzt? Sonst Gastmodus ohne Konto-Knopf. */
  konfiguriert: boolean;
  /** Sitzung bekannt (nach dem ersten Ereignis von Supabase Auth). */
  bereit: boolean;
  email: string | null;
  nutzerId: string | null;
  anmelden: (email: string, passwort: string) => Promise<void>;
  registrieren: (email: string, passwort: string) => Promise<void>;
  abmelden: () => Promise<void>;
  kontoLoeschen: () => Promise<void>;
};

const GAST: KontoWert = {
  konfiguriert: false,
  bereit: true,
  email: null,
  nutzerId: null,
  anmelden: async () => {
    throw new konto.KontoFehler("Konten sind in dieser Installation nicht eingerichtet.");
  },
  registrieren: async () => {
    throw new konto.KontoFehler("Konten sind in dieser Installation nicht eingerichtet.");
  },
  abmelden: async () => undefined,
  kontoLoeschen: async () => undefined,
};

const KontoContext = createContext<KontoWert>(GAST);

export function useKonto(): KontoWert {
  return useContext(KontoContext);
}

/** Anmeldestatus. Ohne Konfiguration fester Gastwert: kein Import von supabase-js, kein Effekt. */
export function KontoProvider({ children }: { children: ReactNode }) {
  if (!konto.kontoKonfiguriert()) {
    return <KontoContext.Provider value={GAST}>{children}</KontoContext.Provider>;
  }
  return <KontoMitSupabase>{children}</KontoMitSupabase>;
}

function KontoMitSupabase({ children }: { children: ReactNode }) {
  const [bereit, setBereit] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [nutzerId, setNutzerId] = useState<string | null>(null);

  useEffect(() => {
    let abmeldung: (() => void) | null = null;
    let aktiv = true;
    konto
      .holeClient()
      .then((client) => {
        if (!aktiv) return;
        // Auch Anmeldungen und Abmeldungen in anderen Tabs kommen hier an.
        const { data } = client.auth.onAuthStateChange((_ereignis, sitzung) => {
          setEmail(sitzung?.user.email ?? null);
          setNutzerId(sitzung?.user.id ?? null);
          setBereit(true);
        });
        abmeldung = () => data.subscription.unsubscribe();
      })
      .catch(() => {
        // Dienst nicht ladbar: wie Gast weiterarbeiten
        if (aktiv) setBereit(true);
      });
    return () => {
      aktiv = false;
      abmeldung?.();
    };
  }, []);

  const anmelden = useCallback(async (e: string, passwort: string) => {
    await konto.anmelden(await konto.holeClient(), e, passwort);
  }, []);

  const registrieren = useCallback(async (e: string, passwort: string) => {
    await konto.registrieren(await konto.holeClient(), e, passwort);
  }, []);

  const abmelden = useCallback(async () => {
    await konto.abmelden(await konto.holeClient());
  }, []);

  const kontoLoeschen = useCallback(async () => {
    await konto.kontoLoeschen(await konto.holeClient());
  }, []);

  const wert = useMemo<KontoWert>(
    () => ({ konfiguriert: true, bereit, email, nutzerId, anmelden, registrieren, abmelden, kontoLoeschen }),
    [bereit, email, nutzerId, anmelden, registrieren, abmelden, kontoLoeschen]
  );

  return <KontoContext.Provider value={wert}>{children}</KontoContext.Provider>;
}
