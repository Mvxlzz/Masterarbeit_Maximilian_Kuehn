"use client";

import type { ReactNode } from "react";

import { AppShell, type SubnavGruppe } from "@/components/app-shell";
import { FallProvider, useFall } from "@/components/fall/fall-provider";

const BLAETTER: SubnavGruppe[] = [
  {
    label: "Methode",
    eintraege: [
      { id: "methode", label: "Formeln der Methode", href: "/blaetter/methode" },
      { id: "glossar", label: "Glossar", href: "/blaetter/glossar" },
    ],
  },
  {
    label: "Fall",
    eintraege: [
      { id: "fall", label: "Formeln des Falls", href: "/blaetter/fall" },
      { id: "datenblatt", label: "Datenblatt", href: "/blaetter/datenblatt" },
    ],
  },
];

/**
 * Formel- und Datenblätter, nur lesend. Methode und Glossar gehen ohne Projekt, den Leerzustand zeigen die
 * Seiten Fall und Datenblatt selbst.
 */
function BlaetterShell({ children }: { children: ReactNode }) {
  const { fehlerText } = useFall();
  return (
    <AppShell subnav={{ titel: "Blätter", gruppen: BLAETTER }}>
      {fehlerText && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {fehlerText}
        </div>
      )}
      {children}
    </AppShell>
  );
}

export default function BlaetterLayout({ children }: { children: ReactNode }) {
  return (
    <FallProvider>
      <BlaetterShell>{children}</BlaetterShell>
    </FallProvider>
  );
}
