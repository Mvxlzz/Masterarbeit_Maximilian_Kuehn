/**
 * Konten: Anmeldung über Supabase Auth, Projekte in der Tabelle `cases` (Fall-Datei Version 2 als
 * jsonb, Zeilenschutz je Konto).
 *
 * Ohne `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bleibt die App im Gastmodus: Diese Datei
 * lädt supabase-js dann nie. Gerechnet wird hier nichts, gespeichert wird die Fall-Datei unverändert.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { FallDatei } from "./api";

export const TABELLE = "cases";
export const NAME_MAX = 200;
export const BESCHREIBUNG_MAX = 2000;

// Direkt ausgeschrieben: Next.js setzt NEXT_PUBLIC_… nur bei wörtlichem Zugriff beim Build ein.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SCHLUESSEL = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Sind Adresse und öffentlicher Schlüssel gesetzt? Sonst Gastmodus ohne Konto-Knopf. */
export function kontoKonfiguriert(): boolean {
  return URL.length > 0 && SCHLUESSEL.length > 0;
}

export type KontoClient = SupabaseClient;

let clientVersprechen: Promise<KontoClient> | null = null;

/** Der eine Client dieser Seite, erst bei Bedarf geladen (supabase-js gehört nicht in den Gastmodus). */
export function holeClient(): Promise<KontoClient> {
  if (!kontoKonfiguriert()) {
    return Promise.reject(new KontoFehler("Konten sind in dieser Installation nicht eingerichtet."));
  }
  if (!clientVersprechen) {
    clientVersprechen = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(URL, SCHLUESSEL, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    );
  }
  return clientVersprechen;
}

/** Fehler mit deutscher Meldung für die Oberfläche. */
export class KontoFehler extends Error {}

export type KontoEintrag = {
  id: string;
  name: string;
  beschreibung: string;
  /** ISO-Zeitstempel `updated_at` aus der Datenbank. */
  geaendert: string;
};

// ------------------------------------------------------------------ Meldungen

const AUTH: Record<string, string> = {
  invalid_credentials: "E-Mail-Adresse oder Passwort ist falsch.",
  user_already_exists: "Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte melden Sie sich an.",
  email_exists: "Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte melden Sie sich an.",
  weak_password: "Das Passwort ist zu schwach. Es braucht mindestens sechs Zeichen.",
  email_address_invalid: "Die E-Mail-Adresse ist ungültig.",
  validation_failed: "Bitte geben Sie E-Mail-Adresse und Passwort an.",
  over_request_rate_limit: "Zu viele Versuche. Bitte warten Sie einige Minuten.",
  over_email_send_rate_limit: "Zu viele Versuche. Bitte warten Sie einige Minuten.",
  signup_disabled: "Neue Konten sind derzeit nicht möglich.",
  email_not_confirmed: "Die E-Mail-Adresse ist noch nicht bestätigt.",
  session_not_found: "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.",
  refresh_token_not_found: "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.",
};

export const ABGELAUFEN = "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.";

type RohFehler = { code?: string; name?: string; message?: string; status?: number } | null | undefined;

/** Übersetzt einen Fehler von supabase-js in eine deutsche Meldung. */
export function uebersetze(fehler: unknown, aktion: string): KontoFehler {
  if (fehler instanceof KontoFehler) return fehler;
  const f = (fehler ?? {}) as NonNullable<RohFehler>;
  const code = f.code ?? "";
  if (code && AUTH[code]) return new KontoFehler(AUTH[code]);
  const text = f.message ?? "";
  if (
    (f.name ?? "").includes("RetryableFetch") ||
    /failed to fetch|fetch failed|networkerror|load failed/i.test(text)
  ) {
    return new KontoFehler(
      `${aktion} nicht möglich: Der Speicherdienst ist nicht erreichbar. Projekte in diesem Browser funktionieren weiter.`
    );
  }
  if (code === "PGRST301" || code === "PGRST303" || /jwt expired/i.test(text) || f.status === 401) {
    return new KontoFehler(ABGELAUFEN);
  }
  return new KontoFehler(`${aktion} nicht möglich. Meldung des Speicherdienstes: ${text || code || "unbekannt"}`);
}

// ------------------------------------------------------------------ Hilfen

/** Name und Beschreibung in der Fall-Datei gleichziehen, damit Export und Anzeige denselben Namen zeigen. */
export function mitNamen(datei: FallDatei, name: string, beschreibung: string): FallDatei {
  const kopie = structuredClone(datei);
  const modell = kopie.modell as Record<string, unknown> | undefined;
  if (modell && typeof modell === "object") {
    modell.name = name;
    modell.beschreibung = beschreibung;
  }
  return kopie;
}

function zeile(name: string, beschreibung: string, datei: FallDatei) {
  const n = name.trim().slice(0, NAME_MAX) || "Ohne Namen";
  const b = beschreibung.trim().slice(0, BESCHREIBUNG_MAX);
  // updated_at setzt der Trigger, user_id der Standardwert auth.uid(): beides nicht senden.
  return { name: n, beschreibung: b || null, modell: mitNamen(datei, n, b) };
}

type Roh = { id: string; name: string; beschreibung: string | null; updated_at: string };

function eintrag(z: Roh): KontoEintrag {
  return { id: z.id, name: z.name, beschreibung: z.beschreibung ?? "", geaendert: z.updated_at };
}

// ------------------------------------------------------------------ Anmeldung

function eingabePruefen(email: string, passwort: string): string {
  const e = email.trim();
  if (!e || !passwort) throw new KontoFehler(AUTH.validation_failed);
  return e;
}

/** Legt ein Konto an und meldet an. Liefert die E-Mail-Adresse. */
export async function registrieren(client: KontoClient, email: string, passwort: string): Promise<string> {
  const e = eingabePruefen(email, passwort);
  const { data, error } = await client.auth.signUp({ email: e, password: passwort });
  if (error) throw uebersetze(error, "Registrierung");
  if (!data.session) {
    throw new KontoFehler("Konto angelegt. Bitte bestätigen Sie die E-Mail-Adresse und melden Sie sich danach an.");
  }
  return data.user?.email ?? e;
}

export async function anmelden(client: KontoClient, email: string, passwort: string): Promise<string> {
  const e = eingabePruefen(email, passwort);
  const { data, error } = await client.auth.signInWithPassword({ email: e, password: passwort });
  if (error) throw uebersetze(error, "Anmeldung");
  return data.user?.email ?? e;
}

export async function abmelden(client: KontoClient): Promise<void> {
  // Lokal ist die Sitzung danach ohnehin beendet, auch wenn der Dienst nicht antwortet.
  await client.auth.signOut({ scope: "local" }).catch(() => undefined);
}

// ------------------------------------------------------------------ Projekte (Tabelle cases)

/** Eigene Projekte, zuletzt geänderte zuerst. Fremde liefert die Datenbank nicht (Zeilenschutz). */
export async function liste(client: KontoClient): Promise<KontoEintrag[]> {
  const { data, error } = await client
    .from(TABELLE)
    .select("id, name, beschreibung, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw uebersetze(error, "Laden der Projekte");
  return ((data ?? []) as Roh[]).map(eintrag);
}

/** Lädt die Fall-Datei eines Projekts. */
export async function lade(client: KontoClient, id: string): Promise<FallDatei> {
  const { data, error } = await client.from(TABELLE).select("modell").eq("id", id).maybeSingle();
  if (error) throw uebersetze(error, "Laden");
  if (!data) throw new KontoFehler("Das Projekt wurde im Konto nicht gefunden.");
  return (data as { modell: FallDatei }).modell;
}

export async function anlegen(
  client: KontoClient,
  name: string,
  beschreibung: string,
  datei: FallDatei
): Promise<KontoEintrag> {
  const { data, error } = await client
    .from(TABELLE)
    .insert(zeile(name, beschreibung, datei))
    .select("id, name, beschreibung, updated_at")
    .single();
  if (error) throw uebersetze(error, "Speichern");
  return eintrag(data as Roh);
}

/** Überschreibt Name, Beschreibung und Fall-Datei eines Projekts (auch Umbenennen). */
export async function speichern(
  client: KontoClient,
  id: string,
  name: string,
  beschreibung: string,
  datei: FallDatei
): Promise<KontoEintrag> {
  const { data, error } = await client
    .from(TABELLE)
    .update(zeile(name, beschreibung, datei))
    .eq("id", id)
    .select("id, name, beschreibung, updated_at");
  if (error) throw uebersetze(error, "Speichern");
  const zeilen = (data ?? []) as Roh[];
  if (zeilen.length === 0) {
    throw new KontoFehler("Das Projekt wurde im Konto nicht gefunden. Es wurde vielleicht an anderer Stelle gelöscht.");
  }
  return eintrag(zeilen[0]);
}

export async function loeschen(client: KontoClient, id: string): Promise<void> {
  const { error } = await client.from(TABELLE).delete().eq("id", id);
  if (error) throw uebersetze(error, "Löschen");
}

/** Löscht das eigene Konto mit allen Projekten (Datenbankfunktion konto_loeschen, on delete cascade). */
export async function kontoLoeschen(client: KontoClient): Promise<void> {
  const { error } = await client.rpc("konto_loeschen");
  if (error) throw uebersetze(error, "Löschen des Kontos");
  await abmelden(client);
}
