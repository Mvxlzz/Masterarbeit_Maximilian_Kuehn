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

import * as api from "@/lib/api";
import { dateiname, herunterladen } from "@/lib/blaetter";
import { ursprungAusDatei } from "@/lib/fall";
import * as konto from "@/lib/konto";
import { useKonto } from "@/components/konto-provider";
import {
  KONTO_PRAEFIX,
  REFERENZ_ID,
  aktivesSzenario,
  istKontoId,
  leseKontoSzenarien,
  leseOffenId,
  leseProjekte,
  neuesProjekt,
  schreibeKontoSzenario,
  schreibeOffenId,
  schreibeProjekte,
  heuteIso,
  type Projekt,
} from "@/lib/projekte";

type NeuesProjektEingabe = {
  name: string;
  beschreibung: string;
  grundlage: "leer" | "kopie";
};

/** Speicherstand eines Konto-Projekts. */
export type Speicherstand =
  | { stand: "gespeichert"; zeit: string }
  | { stand: "ausstehend" }
  | { stand: "speichert" }
  | { stand: "fehler"; text: string };

/** Zustand der Konto-Liste: aus (nicht angemeldet), lädt, bereit, fehler. */
export type KontoListe = { stand: "aus" } | { stand: "laedt" } | { stand: "bereit" } | { stand: "fehler"; text: string };

type ProjekteContextWert = {
  /** Projekte dieses Browsers (mit Referenz) und, bei Anmeldung, die Projekte im Konto. */
  projekte: Projekt[];
  offenId: string | null;
  offenesProjekt: Projekt | undefined;
  bereit: boolean;
  oeffnen: (id: string) => void;
  schliessen: () => void;
  anlegen: (eingabe: NeuesProjektEingabe) => Promise<Projekt>;
  umbenennen: (id: string, name: string, beschreibung: string) => Promise<void>;
  /** Kopie mit der vollständigen Fall-Datei; lädt sie vorher, falls sie noch nicht im Zustand liegt. */
  duplizieren: (id: string) => Promise<Projekt>;
  loeschen: (id: string) => Promise<void>;
  importieren: (datei: api.FallDatei, name: string) => Promise<Projekt>;
  aktualisiereErgebnis: (id: string, ergebnis: api.ModellErgebnis) => void;
  aktualisiereDatei: (id: string, datei: api.FallDatei) => void;
  exportiereJson: (id: string) => Promise<void>;
  ladeProjektdatei: (id: string) => Promise<api.FallDatei>;
  istSchreibgeschuetzt: (id: string) => boolean;
  /** Aktives Szenario setzen, `null` = Basisfall. Auch beim schreibgeschützten Referenzprojekt. */
  setzeSzenario: (id: string, szenario: string | null) => void;
  /** Angemeldet? Dann landen neue Projekte im Konto. */
  angemeldet: boolean;
  kontoListe: KontoListe;
  ladeKontoListe: () => Promise<void>;
  speicherstand: Record<string, Speicherstand>;
  /** Ausstehende Änderung sofort speichern (auch „Erneut versuchen“). */
  speichereJetzt: (id: string) => Promise<void>;
  /** Alle ausstehenden Änderungen speichern, z. B. vor dem Abmelden. */
  speichereAlles: () => Promise<void>;
  /** Projekt dieses Browsers ins Konto verschieben; die Browser-Kopie verschwindet erst nach Erfolg. */
  verschiebeInsKonto: (id: string) => Promise<Projekt>;
};

const ProjekteContext = createContext<ProjekteContextWert | null>(null);

const SPEICHERN_NACH_MS = 1000;

export function useProjekte(): ProjekteContextWert {
  const ctx = useContext(ProjekteContext);
  if (!ctx) {
    throw new Error("useProjekte muss innerhalb von <ProjekteProvider> aufgerufen werden.");
  }
  return ctx;
}

function mitUrsprung(projekt: Projekt, datei: api.FallDatei): Projekt {
  if (projekt.ursprung) return { ...projekt, datei };
  return { ...projekt, datei, ursprung: ursprungAusDatei(datei) };
}

function ausEintrag(e: konto.KontoEintrag, szenarien: Record<string, string | null>): Projekt {
  const p: Projekt = {
    id: `${KONTO_PRAEFIX}${e.id}`,
    kontoId: e.id,
    ort: "konto",
    name: e.name,
    beschreibung: e.beschreibung,
    grundlage: "vorlage",
    geaendert: e.geaendert,
  };
  if (e.id in szenarien) p.szenario = szenarien[e.id];
  return p;
}

/** Aktives Szenario des geöffneten Projekts und Setzer. */
export function useAktivesSzenario(): {
  szenario: string | null;
  setzen: (szenario: string | null) => void;
} {
  const { offenesProjekt, setzeSzenario } = useProjekte();
  const id = offenesProjekt?.id;
  const szenario = aktivesSzenario(offenesProjekt?.szenario, offenesProjekt?.datei);
  const setzen = useCallback(
    (s: string | null) => {
      if (id) setzeSzenario(id, s);
    },
    [id, setzeSzenario]
  );
  return { szenario, setzen };
}

export function ProjekteProvider({ children }: { children: ReactNode }) {
  const { email, nutzerId, bereit: kontoBereit } = useKonto();
  const angemeldet = email !== null;

  const [lokal, setLokalZustand] = useState<Projekt[]>([]);
  const [kontoProjekte, setKontoZustand] = useState<Projekt[]>([]);
  const [offenId, setOffenId] = useState<string | null>(null);
  const [lokalBereit, setLokalBereit] = useState(false);
  const [kontoListe, setKontoListe] = useState<KontoListe>({ stand: "aus" });
  const [speicherstand, setSpeicherstand] = useState<Record<string, Speicherstand>>({});

  // Aktueller Stand für asynchrone Abläufe (Speichern, Laden), ohne auf ein Rendern zu warten. Beide Listen
  // ändern sich nur über diese Setter, die Ref und Zustand gemeinsam führen.
  const kontoRef = useRef<Projekt[]>([]);
  const lokalRef = useRef<Projekt[]>([]);
  const setKontoProjekte = useCallback((fn: Projekt[] | ((alt: Projekt[]) => Projekt[])) => {
    kontoRef.current = typeof fn === "function" ? fn(kontoRef.current) : fn;
    setKontoZustand(kontoRef.current);
  }, []);
  const setLokal = useCallback((fn: Projekt[] | ((alt: Projekt[]) => Projekt[])) => {
    lokalRef.current = typeof fn === "function" ? fn(lokalRef.current) : fn;
    setLokalZustand(lokalRef.current);
  }, []);
  const ausstehend = useRef(new Map<string, api.FallDatei>());
  const zeitgeber = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const laeuft = useRef(new Map<string, Promise<void>>());
  const sitzung = useRef(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLokal(leseProjekte());
    setOffenId(leseOffenId());
    setLokalBereit(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [setLokal]);

  useEffect(() => {
    if (lokalBereit) schreibeProjekte(lokal);
  }, [lokal, lokalBereit]);

  const projekte = useMemo(() => [...lokal, ...kontoProjekte], [lokal, kontoProjekte]);

  const offenesProjekt = useMemo(
    () => projekte.find((p) => p.id === offenId),
    [projekte, offenId]
  );

  const oeffnen = useCallback((id: string) => {
    setOffenId(id);
    schreibeOffenId(id);
  }, []);

  const schliessen = useCallback(() => {
    setOffenId(null);
    schreibeOffenId(null);
  }, []);

  /** Ändert ein Projekt in der Liste, in der es liegt. */
  const aendere = useCallback((id: string, fn: (p: Projekt) => Projekt) => {
    if (istKontoId(id)) setKontoProjekte((liste) => liste.map((p) => (p.id === id ? fn(p) : p)));
    else setLokal((liste) => liste.map((p) => (p.id === id ? fn(p) : p)));
  }, [setKontoProjekte, setLokal]);

  const finde = useCallback(
    (id: string) => (istKontoId(id) ? kontoRef.current : lokalRef.current).find((p) => p.id === id),
    []
  );

  const setzeStand = useCallback((id: string, stand: Speicherstand | null) => {
    setSpeicherstand((alt) => {
      const neu = { ...alt };
      if (stand) neu[id] = stand;
      else delete neu[id];
      return neu;
    });
  }, []);

  // ---------------------------------------------------------------- Konto-Liste

  const ladeKontoListe = useCallback(async () => {
    const meine = sitzung.current;
    setKontoListe({ stand: "laedt" });
    try {
      const client = await konto.holeClient();
      const eintraege = await konto.liste(client);
      if (meine !== sitzung.current) return;
      const szenarien = leseKontoSzenarien();
      setKontoProjekte((alt) =>
        eintraege.map((e) => {
          const vorher = alt.find((p) => p.kontoId === e.id);
          const neu = ausEintrag(e, szenarien);
          // Bereits geladene Datei und Ergebnis behalten
          return vorher ? { ...vorher, ...neu, datei: vorher.datei, ursprung: vorher.ursprung } : neu;
        })
      );
      setKontoListe({ stand: "bereit" });
    } catch (err) {
      if (meine !== sitzung.current) return;
      setKontoListe({ stand: "fehler", text: konto.uebersetze(err, "Laden der Projekte").message });
    }
  }, [setKontoProjekte]);

  // An- und Abmelden (auch aus einem anderen Tab)
  const vorherNutzer = useRef<string | null>(null);
  useEffect(() => {
    const warAngemeldet = vorherNutzer.current !== null;
    vorherNutzer.current = nutzerId;
    sitzung.current += 1;
    for (const t of zeitgeber.current.values()) clearTimeout(t);
    zeitgeber.current.clear();
    ausstehend.current.clear();
    /* eslint-disable react-hooks/set-state-in-effect -- Konto-Projekte folgen der Sitzung */
    setKontoProjekte([]);
    setSpeicherstand({});
    if (!nutzerId) {
      setKontoListe({ stand: "aus" });
      // Nur nach einer Abmeldung schließen; beim Neuladen ist die Sitzung am Anfang noch unbekannt
      if (warAngemeldet) {
        setOffenId((aktuell) => {
          if (istKontoId(aktuell)) {
            schreibeOffenId(null);
            return null;
          }
          return aktuell;
        });
      }
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    void ladeKontoListe();
  }, [nutzerId, ladeKontoListe, setKontoProjekte]);

  // Solange angemeldet die Liste lädt, ist ein offenes Konto-Projekt noch unbekannt
  const bereit =
    lokalBereit && kontoBereit && !(angemeldet && (kontoListe.stand === "aus" || kontoListe.stand === "laedt"));

  // ---------------------------------------------------------------- Fall-Dateien

  const istSchreibgeschuetzt = useCallback((id: string) => id === REFERENZ_ID, []);

  const ladeProjektdatei = useCallback(
    async (id: string): Promise<api.FallDatei> => {
      const bestehend = finde(id);
      if (bestehend?.datei) {
        if (!bestehend.ursprung) aendere(id, (p) => mitUrsprung(p, bestehend.datei!));
        return bestehend.datei;
      }
      let datei: api.FallDatei;
      if (istKontoId(id)) {
        if (!bestehend?.kontoId) throw new konto.KontoFehler("Das Projekt wurde im Konto nicht gefunden.");
        datei = await konto.lade(await konto.holeClient(), bestehend.kontoId);
      } else {
        datei =
          id === REFERENZ_ID ? await api.holeReferenzmodell() : await api.holeVorlage(bestehend?.name);
      }
      aendere(id, (p) => (p.datei ? p : mitUrsprung(p, datei)));
      return datei;
    },
    [finde, aendere]
  );

  /** Neues Projekt aufnehmen: bei Anmeldung in `cases`, sonst in diesem Browser. */
  const aufnehmen = useCallback(
    async (projekt: Projekt, datei: api.FallDatei): Promise<Projekt> => {
      if (angemeldet) {
        const eintrag = await konto.anlegen(await konto.holeClient(), projekt.name, projekt.beschreibung, datei);
        const neu: Projekt = {
          ...projekt,
          ...ausEintrag(eintrag, {}),
          grundlage: projekt.grundlage,
          basis: projekt.basis,
          datei: konto.mitNamen(datei, eintrag.name, eintrag.beschreibung),
          ursprung: projekt.ursprung ?? ursprungAusDatei(datei),
        };
        if (projekt.szenario !== undefined) {
          neu.szenario = projekt.szenario;
          schreibeKontoSzenario(eintrag.id, projekt.szenario);
        }
        setKontoProjekte((liste) => [neu, ...liste]);
        setzeStand(neu.id, { stand: "gespeichert", zeit: eintrag.geaendert });
        return neu;
      }
      const neu = { ...projekt, datei, ursprung: projekt.ursprung ?? ursprungAusDatei(datei) };
      setLokal((liste) => [...liste, neu]);
      return neu;
    },
    [angemeldet, setzeStand, setKontoProjekte, setLokal]
  );

  const anlegen = useCallback(
    async (eingabe: NeuesProjektEingabe): Promise<Projekt> => {
      let datei: api.FallDatei;
      if (eingabe.grundlage === "kopie") {
        datei = structuredClone(await api.holeReferenzmodell());
      } else {
        datei = await api.holeVorlage(eingabe.name);
      }
      datei = konto.mitNamen(datei, eingabe.name, eingabe.beschreibung);
      const projekt = neuesProjekt(eingabe.name, eingabe.beschreibung, "vorlage", eingabe.grundlage);
      return aufnehmen(projekt, datei);
    },
    [aufnehmen]
  );

  const duplizieren = useCallback(
    async (id: string): Promise<Projekt> => {
      const vorlage = finde(id);
      // Die Datei kommt aus ladeProjektdatei, nicht aus dem Zustand: Ist sie dort noch nicht angekommen (z. B.
      // Klick direkt nach dem Laden der Seite), entstünde sonst eine leere Kopie.
      const datei = structuredClone(await ladeProjektdatei(id));
      const name = `${vorlage?.name ?? "Projekt"} (Kopie)`;
      const beschreibung = vorlage?.beschreibung ?? "";
      const projekt = neuesProjekt(name, beschreibung, "vorlage", "kopie");
      return aufnehmen(projekt, konto.mitNamen(datei, name, beschreibung));
    },
    [finde, ladeProjektdatei, aufnehmen]
  );

  const importieren = useCallback(
    async (datei: api.FallDatei, name: string): Promise<Projekt> => {
      const meldungen = await api.pruefen(datei);
      const fehler = meldungen.filter((m) => m.stufe === "fehler");
      if (fehler.length > 0) {
        throw new api.ApiFehler(fehler.map((m) => `${m.ort}: ${m.text}`).join("; "));
      }
      return aufnehmen(neuesProjekt(name, "", "import"), datei);
    },
    [aufnehmen]
  );

  // ---------------------------------------------------------------- Speichern im Konto (entprellt)

  const speichereJetzt = useCallback(
    async (id: string): Promise<void> => {
      const t = zeitgeber.current.get(id);
      if (t) clearTimeout(t);
      zeitgeber.current.delete(id);
      const vorher = laeuft.current.get(id);
      const lauf = (async () => {
        if (vorher) await vorher.catch(() => undefined);
        const datei = ausstehend.current.get(id);
        const projekt = kontoRef.current.find((p) => p.id === id);
        if (!datei || !projekt?.kontoId) return;
        const meine = sitzung.current;
        ausstehend.current.delete(id);
        setzeStand(id, { stand: "speichert" });
        try {
          const eintrag = await konto.speichern(
            await konto.holeClient(),
            projekt.kontoId,
            projekt.name,
            projekt.beschreibung,
            datei
          );
          if (meine !== sitzung.current) return;
          if (!ausstehend.current.has(id)) setzeStand(id, { stand: "gespeichert", zeit: eintrag.geaendert });
          aendere(id, (p) => ({ ...p, geaendert: eintrag.geaendert }));
        } catch (err) {
          if (meine !== sitzung.current) return;
          // Stand behalten, damit „Erneut versuchen“ ihn senden kann (eine neuere Änderung hat Vorrang)
          if (!ausstehend.current.has(id)) ausstehend.current.set(id, datei);
          setzeStand(id, { stand: "fehler", text: konto.uebersetze(err, "Speichern").message });
          throw err;
        }
      })();
      laeuft.current.set(id, lauf);
      try {
        await lauf;
      } finally {
        if (laeuft.current.get(id) === lauf) laeuft.current.delete(id);
      }
    },
    [aendere, setzeStand]
  );

  const planeSpeichern = useCallback(
    (id: string, datei: api.FallDatei) => {
      ausstehend.current.set(id, datei);
      setzeStand(id, { stand: "ausstehend" });
      const t = zeitgeber.current.get(id);
      if (t) clearTimeout(t);
      zeitgeber.current.set(
        id,
        setTimeout(() => {
          void speichereJetzt(id).catch(() => undefined);
        }, SPEICHERN_NACH_MS)
      );
    },
    [setzeStand, speichereJetzt]
  );

  const speichereAlles = useCallback(async () => {
    const ids = new Set([...ausstehend.current.keys(), ...laeuft.current.keys()]);
    await Promise.all([...ids].map((id) => speichereJetzt(id).catch(() => undefined)));
  }, [speichereJetzt]);

  // Beim Verlassen der Seite nachfragen, solange etwas nicht im Konto ist
  useEffect(() => {
    function vorDemVerlassen(e: BeforeUnloadEvent) {
      if (ausstehend.current.size > 0 || laeuft.current.size > 0) {
        void speichereAlles();
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", vorDemVerlassen);
    return () => window.removeEventListener("beforeunload", vorDemVerlassen);
  }, [speichereAlles]);

  // ---------------------------------------------------------------- Ändern, Umbenennen, Löschen

  const aktualisiereDatei = useCallback(
    (id: string, datei: api.FallDatei) => {
      if (id === REFERENZ_ID) return;
      aendere(id, (p) => ({
        ...p,
        datei,
        ursprung: p.ursprung ?? ursprungAusDatei(datei),
        geaendert: heuteIso(),
      }));
      if (istKontoId(id)) planeSpeichern(id, datei);
    },
    [aendere, planeSpeichern]
  );

  const umbenennen = useCallback(
    async (id: string, name: string, beschreibung: string) => {
      if (istKontoId(id)) {
        const datei = konto.mitNamen(await ladeProjektdatei(id), name, beschreibung);
        const projekt = finde(id);
        if (!projekt?.kontoId) return;
        // Erst im Konto, dann in der Liste: Scheitert es, bleibt der alte Name sichtbar
        const client = await konto.holeClient();
        const eintrag = await konto.speichern(client, projekt.kontoId, name, beschreibung, datei);
        const offen = ausstehend.current.get(id);
        if (offen) ausstehend.current.set(id, konto.mitNamen(offen, name, beschreibung));
        aendere(id, (p) => ({ ...p, name, beschreibung, datei, geaendert: eintrag.geaendert }));
        setzeStand(id, { stand: "gespeichert", zeit: eintrag.geaendert });
        return;
      }
      // Name in der Fall-Datei mitziehen, damit Export und Anzeige denselben Namen zeigen
      aendere(id, (p) => ({
        ...p,
        name,
        beschreibung,
        datei: p.datei ? konto.mitNamen(p.datei, name, beschreibung) : p.datei,
        geaendert: heuteIso(),
      }));
    },
    [ladeProjektdatei, finde, aendere, setzeStand]
  );

  const entferne = useCallback(
    (id: string) => {
      if (istKontoId(id)) setKontoProjekte((liste) => liste.filter((p) => p.id !== id));
      else setLokal((liste) => liste.filter((p) => p.id !== id));
      setOffenId((aktuell) => {
        if (aktuell === id) {
          schreibeOffenId(null);
          return null;
        }
        return aktuell;
      });
    },
    [setKontoProjekte, setLokal]
  );

  const loeschen = useCallback(
    async (id: string) => {
      if (id === REFERENZ_ID) return;
      if (istKontoId(id)) {
        const projekt = finde(id);
        if (!projekt?.kontoId) return;
        const t = zeitgeber.current.get(id);
        if (t) clearTimeout(t);
        zeitgeber.current.delete(id);
        ausstehend.current.delete(id);
        await konto.loeschen(await konto.holeClient(), projekt.kontoId);
        schreibeKontoSzenario(projekt.kontoId, undefined);
        setzeStand(id, null);
      }
      entferne(id);
    },
    [finde, entferne, setzeStand]
  );

  const verschiebeInsKonto = useCallback(
    async (id: string): Promise<Projekt> => {
      const projekt = finde(id);
      if (!projekt || id === REFERENZ_ID || istKontoId(id)) {
        throw new konto.KontoFehler("Dieses Projekt lässt sich nicht verschieben.");
      }
      if (!angemeldet) throw new konto.KontoFehler("Bitte melden Sie sich zuerst an.");
      // Immer über ladeProjektdatei: Die Datei kann im Zustand noch fehlen (Lehre aus PR #27)
      const datei = await ladeProjektdatei(id);
      const kopie = konto.mitNamen(datei, projekt.name, projekt.beschreibung);
      const neu = await aufnehmen({ ...projekt, datei: undefined }, kopie);
      setLokal((liste) => liste.filter((p) => p.id !== id));
      setOffenId((aktuell) => {
        if (aktuell === id) {
          schreibeOffenId(neu.id);
          return neu.id;
        }
        return aktuell;
      });
      return neu;
    },
    [finde, angemeldet, ladeProjektdatei, aufnehmen, setLokal]
  );

  // ---------------------------------------------------------------- Ergebnis, Szenario, Export

  const aktualisiereErgebnis = useCallback(
    (id: string, ergebnis: api.ModellErgebnis) => {
      const rang1 = ergebnis.rangfolge[0];
      aendere(id, (p) => ({
        ...p,
        nutzwertRang1: rang1 !== undefined ? ergebnis.nutzwert[rang1] : undefined,
        rang1Name: rang1,
      }));
    },
    [aendere]
  );

  const setzeSzenario = useCallback(
    (id: string, szenario: string | null) => {
      aendere(id, (p) => ({ ...p, szenario }));
      const kontoId = finde(id)?.kontoId;
      if (kontoId) schreibeKontoSzenario(kontoId, szenario);
    },
    [aendere, finde]
  );

  const exportiereJson = useCallback(
    async (id: string) => {
      const projekt = finde(id);
      if (!projekt) return;
      const datei = await ladeProjektdatei(id);
      const text = JSON.stringify(datei, null, 1);
      herunterladen(new Blob([text], { type: "application/json" }), dateiname(projekt.name, null, "json"));
    },
    [finde, ladeProjektdatei]
  );

  const wert = useMemo<ProjekteContextWert>(
    () => ({
      projekte,
      offenId,
      offenesProjekt,
      bereit,
      oeffnen,
      schliessen,
      anlegen,
      umbenennen,
      duplizieren,
      loeschen,
      importieren,
      aktualisiereErgebnis,
      aktualisiereDatei,
      exportiereJson,
      ladeProjektdatei,
      istSchreibgeschuetzt,
      setzeSzenario,
      angemeldet,
      kontoListe,
      ladeKontoListe,
      speicherstand,
      speichereJetzt,
      speichereAlles,
      verschiebeInsKonto,
    }),
    [
      projekte,
      offenId,
      offenesProjekt,
      bereit,
      oeffnen,
      schliessen,
      anlegen,
      umbenennen,
      duplizieren,
      loeschen,
      importieren,
      aktualisiereErgebnis,
      aktualisiereDatei,
      exportiereJson,
      ladeProjektdatei,
      istSchreibgeschuetzt,
      setzeSzenario,
      angemeldet,
      kontoListe,
      ladeKontoListe,
      speicherstand,
      speichereJetzt,
      speichereAlles,
      verschiebeInsKonto,
    ]
  );

  return <ProjekteContext.Provider value={wert}>{children}</ProjekteContext.Provider>;
}
