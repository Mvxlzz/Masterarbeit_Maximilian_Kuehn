"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, Download } from "lucide-react";

import { useProjekte } from "@/components/projekte-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiFehler, exportErgebnisseCsv, exportFelderCsv, pruefen, type FallDatei } from "@/lib/api";
import { dateiname, herunterladen } from "@/lib/blaetter";
import { cn } from "@/lib/utils";

type Pruefung = { stand: "pruefe" } | { stand: "ok" } | { stand: "fehler"; anzahl: number };
type Teil = "felder" | "ergebnisse";

function Eintrag({
  titel,
  text,
  hinweis,
  gesperrt = false,
}: {
  titel: string;
  text: string;
  hinweis?: ReactNode;
  gesperrt?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
      <span className={cn("font-medium", gesperrt && "text-muted-foreground")}>{titel}</span>
      <span className="text-xs leading-snug text-muted-foreground">{text}</span>
      {hinweis}
    </span>
  );
}

/**
 * Knopf „Exportieren“ in der Kopfleiste: Fall als JSON, Felder und Ergebnisse als CSV. Die CSV-Dateien
 * schreibt die API (api/export.py). „Ergebnisse als CSV“ ist gesperrt, solange der Fall Prüffehler enthält.
 */
export function ExportMenue() {
  const { offenesProjekt, ladeProjektdatei, exportiereJson } = useProjekte();
  const [offen, setOffen] = useState(false);
  const [datei, setDatei] = useState<FallDatei | null>(null);
  const [pruefung, setPruefung] = useState<Pruefung>({ stand: "pruefe" });
  const [laedt, setLaedt] = useState<Teil | null>(null);
  const [fehler, setFehler] = useState<{ teil: Teil; text: string } | null>(null);

  if (!offenesProjekt) return null;
  const projekt = offenesProjekt;

  async function beimOeffnen() {
    setFehler(null);
    setPruefung({ stand: "pruefe" });
    try {
      const d = await ladeProjektdatei(projekt.id);
      setDatei(d);
      const meldungen = await pruefen(d);
      const anzahl = meldungen.filter((m) => m.stufe === "fehler").length;
      setPruefung(anzahl > 0 ? { stand: "fehler", anzahl } : { stand: "ok" });
    } catch (e) {
      setPruefung({ stand: "fehler", anzahl: 0 });
      setFehler({
        teil: "ergebnisse",
        text: e instanceof ApiFehler ? e.message : "Der Fall ließ sich nicht prüfen.",
      });
    }
  }

  async function laden(teil: Teil) {
    setFehler(null);
    setLaedt(teil);
    try {
      const d = datei ?? (await ladeProjektdatei(projekt.id));
      const blob = teil === "felder" ? await exportFelderCsv(d) : await exportErgebnisseCsv(d);
      herunterladen(blob, dateiname(projekt.name, teil));
      setOffen(false);
    } catch (e) {
      setFehler({
        teil,
        text: e instanceof ApiFehler ? e.message : "Der Export ist fehlgeschlagen.",
      });
    } finally {
      setLaedt(null);
    }
  }

  const ergebnisGesperrt = pruefung.stand !== "ok";
  const fehlerZeile = (teil: Teil) =>
    fehler?.teil === teil ? (
      <span role="alert" className="text-xs leading-snug text-[var(--status-ausschluss-fg)]">
        {fehler.text}
      </span>
    ) : null;

  return (
    <DropdownMenu
      open={offen}
      onOpenChange={(o) => {
        setOffen(o);
        if (o) void beimOeffnen();
      }}
    >
      <DropdownMenuTrigger
        data-testid="export-knopf"
        title="Fall und Ergebnisse exportieren"
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-foreground hover:bg-accent data-popup-open:bg-accent"
      >
        <Download className="size-3.5" aria-hidden />
        Exportieren
        <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">Projekt „{projekt.name}“</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void exportiereJson(projekt.id)} className="items-start">
            <Eintrag
              titel="Fall als JSON"
              text="Alle Eingaben, Formeln und Szenarien. Lässt sich unter Projekte wieder importieren."
            />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Für Tabellenprogramme (Semikolon, Dezimalkomma)</DropdownMenuLabel>
          <DropdownMenuItem
            closeOnClick={false}
            disabled={laedt !== null}
            onClick={() => void laden("felder")}
            className="items-start data-disabled:opacity-100"
          >
            <Eintrag
              titel={laedt === "felder" ? "Felder als CSV …" : "Felder als CSV"}
              text="Alle Felder mit Wert, Einheit, Herkunft, Quelle und Spanne."
              hinweis={fehlerZeile("felder")}
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            closeOnClick={false}
            disabled={ergebnisGesperrt || laedt !== null}
            onClick={() => void laden("ergebnisse")}
            data-testid="export-ergebnisse"
            className="items-start data-disabled:opacity-100"
          >
            <Eintrag
              titel={laedt === "ergebnisse" ? "Ergebnisse als CSV …" : "Ergebnisse als CSV"}
              text="Basisfall und alle Szenarien je Alternative, ungerundet."
              gesperrt={ergebnisGesperrt}
              hinweis={
                <>
                  {pruefung.stand === "pruefe" && (
                    <span className="text-xs leading-snug text-muted-foreground">Fall wird geprüft …</span>
                  )}
                  {pruefung.stand === "fehler" && pruefung.anzahl > 0 && (
                    <span className="text-xs leading-snug text-[var(--status-warnung-fg)]" data-testid="export-sperre">
                      Gesperrt, solange der Fall {pruefung.anzahl} Fehler enthält.
                    </span>
                  )}
                  {fehlerZeile("ergebnisse")}
                </>
              }
            />
          </DropdownMenuItem>
          {pruefung.stand === "fehler" && pruefung.anzahl > 0 && (
            <DropdownMenuItem render={<Link href="/fall/datenblatt" />} className="text-xs">
              Zu den Prüfmeldungen →
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
