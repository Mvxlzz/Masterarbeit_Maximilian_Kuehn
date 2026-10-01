"use client";

import { ArchitekturAbbildung } from "@/components/architektur/diagramm";
import { ABB, ABB_HOEHE } from "@/lib/architektur";

/**
 * Architektur als Abbildung für die Arbeit (Kapitel 5): schwarz-weiß, feste Größe, ohne Bedienung. Aus derselben
 * Beschreibung wie das Diagramm auf /architektur. `werkzeuge/abbildung_architektur.py` speichert sie als PNG und PDF.
 */
export default function ArchitekturAbbildungPage() {
  return (
    <main className="min-h-screen bg-white p-6">
      <div
        data-testid="abbildung"
        className="bg-white"
        style={{ width: ABB.breite + 2, height: ABB_HOEHE + 2 }}
      >
        <ArchitekturAbbildung />
      </div>
    </main>
  );
}
