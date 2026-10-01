"use client";

import type { ReactNode } from "react";
import { Copy, Layers } from "lucide-react";

import { AppShell, type SubnavGruppe } from "@/components/app-shell";
import { FallProvider, useFall } from "@/components/fall/fall-provider";
import { Pruefleiste } from "@/components/fall/pruefleiste";
import { Leerzustand } from "@/components/leerzustand";
import { useProjekte } from "@/components/projekte-provider";
import { VergleichProvider } from "@/components/szenarien/vergleich-provider";
import { Button } from "@/components/ui/button";

const SZENARIEN: SubnavGruppe[] = [
  {
    label: "Szenarien",
    eintraege: [
      { id: "bausteine", label: "Faktorbausteine", href: "/szenarien/bausteine" },
      { id: "faktoren", label: "Faktorbibliothek", href: "/szenarien/faktoren" },
      { id: "matrix", label: "Szenario-Matrix", href: "/szenarien/matrix" },
      { id: "vergleich", label: "Vergleich", href: "/szenarien/vergleich" },
    ],
  },
];

function SzenarienShell({ children }: { children: ReactNode }) {
  const { offenesProjekt } = useProjekte();
  const { meldungen, aktuell, schreibgeschuetzt, kopieAnlegenUndBearbeiten, fehlerText } = useFall();

  if (!offenesProjekt) {
    return (
      <AppShell subnav={{ titel: "Szenarien", gruppen: SZENARIEN }}>
        <header className="mb-6">
          <h1 className="mb-1.5 text-2xl font-medium tracking-tight">Einflussfaktoren und Szenarien</h1>
          <p className="max-w-[68ch] text-sm text-muted-foreground blocksatz">
            Faktorbausteine, Einflussfaktoren, Szenario-Matrix und Vergleich mit dem Basisfall.
          </p>
        </header>
        <Leerzustand
          icon={<Layers className="size-[18px]" strokeWidth={1.5} />}
          titel="Kein Projekt geöffnet"
          text="Öffnen Sie ein Projekt unter Projekte, dann erscheinen hier seine Einflussfaktoren und Szenarien."
        />
      </AppShell>
    );
  }

  return (
    <AppShell subnav={{ titel: "Szenarien", gruppen: SZENARIEN }}>
      {schreibgeschuetzt && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm"
        >
          <p>
            Referenzprojekt, schreibgeschützt. Legen Sie eine Kopie an, um Einflussfaktoren oder
            Szenarien zu ändern.
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

export default function SzenarienLayout({ children }: { children: ReactNode }) {
  return (
    <FallProvider>
      <VergleichProvider>
        <SzenarienShell>{children}</SzenarienShell>
      </VergleichProvider>
    </FallProvider>
  );
}
