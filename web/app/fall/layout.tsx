"use client";

import type { ReactNode } from "react";
import { Copy } from "lucide-react";

import { AppShell, type SubnavGruppe } from "@/components/app-shell";
import { FallProvider, useFall } from "@/components/fall/fall-provider";
import { Pruefleiste } from "@/components/fall/pruefleiste";
import { useProjekte } from "@/components/projekte-provider";
import { Button } from "@/components/ui/button";
import { Leerzustand } from "@/components/leerzustand";
import { FileSpreadsheet } from "lucide-react";

const BAUKASTEN: SubnavGruppe[] = [
  {
    label: "Baukasten",
    eintraege: [
      { id: "bauteil", label: "Bauteil und Schaden", href: "/fall/bauteil" },
      { id: "gate", label: "Gate", href: "/fall/gate" },
      { id: "alternativen", label: "Alternativen", href: "/fall/alternativen" },
      { id: "datenblatt", label: "Datenblatt", href: "/fall/datenblatt" },
      { id: "formeln", label: "Formeln", href: "/fall/formeln" },
      { id: "technik", label: "Technik", href: "/fall/technik" },
      { id: "gewichte", label: "Gewichte", href: "/fall/gewichte" },
    ],
  },
];

function FallShell({ children }: { children: ReactNode }) {
  const { offenesProjekt } = useProjekte();
  const {
    meldungen,
    aktuell,
    schreibgeschuetzt,
    kopieAnlegenUndBearbeiten,
    fehlerText,
  } = useFall();

  if (!offenesProjekt) {
    return (
      <AppShell subnav={{ titel: "Fall bearbeiten", gruppen: BAUKASTEN }}>
        <header className="mb-6">
          <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Fall bearbeiten</h1>
          <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
            Bauteil, Gate, Alternativen, Felder, Formeln und Gewichte des geöffneten Projekts.
          </p>
        </header>
        <Leerzustand
          icon={<FileSpreadsheet className="size-[18px]" strokeWidth={1.5} />}
          titel="Kein Projekt geöffnet"
          text="Öffnen Sie ein Projekt unter Projekte, dann erscheint hier sein Datenblatt."
        />
      </AppShell>
    );
  }

  return (
    <AppShell subnav={{ titel: "Fall bearbeiten", gruppen: BAUKASTEN }}>
      {schreibgeschuetzt && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm"
        >
          <p>
            Referenzprojekt, schreibgeschützt. Legen Sie eine Kopie an, um Werte, Formeln oder
            Gewichte zu ändern.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => void kopieAnlegenUndBearbeiten()}
            aria-label="Kopie anlegen und bearbeiten"
          >
            <Copy className="size-3.5" aria-hidden />
            Kopie anlegen und bearbeiten
          </Button>
        </div>
      )}
      {fehlerText && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {fehlerText}
        </div>
      )}
      <Pruefleiste meldungen={meldungen} aktuell={aktuell} />
      {children}
    </AppShell>
  );
}

export default function FallLayout({ children }: { children: ReactNode }) {
  return (
    <FallProvider>
      <FallShell>{children}</FallShell>
    </FallProvider>
  );
}
