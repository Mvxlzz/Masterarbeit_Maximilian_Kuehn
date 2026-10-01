/**
 * Achsenbereich mit runden Marken für Diagramme; schließt 0 ein. Nur Skalierung der Darstellung, keine Fachrechnung.
 */
export function achse(werte: number[]): { bereich: [number, number]; marken: number[] } {
  const lo = Math.min(0, ...werte);
  const hi = Math.max(0, ...werte);
  const roh = (hi - lo) / 5 || 1;
  const p = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * p).find((x) => x >= roh) ?? 10 * p;
  const unten = Math.floor(lo / schritt) * schritt;
  const oben = Math.ceil(hi / schritt) * schritt;
  const marken: number[] = [];
  for (let m = unten; m <= oben + schritt / 2; m += schritt) marken.push(m);
  return { bereich: [unten, oben], marken };
}
