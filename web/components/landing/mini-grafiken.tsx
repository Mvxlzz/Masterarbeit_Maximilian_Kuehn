/**
 * Schematische Kleingrafiken der Landing Page. Rein dekorativ (aria-hidden), ohne Zahlen des Falls:
 * Längen und Verläufe sind Formen, keine Ergebnisse. Farben aus app/tokens.css.
 */

const RAHMEN = "h-16 w-full max-w-[220px]";

/** Drei Rangzeilen, jede aus den Beiträgen der drei Dimensionen. */
export function GrafikDimensionen() {
  const zeilen = [
    [62, 70, 68],
    [50, 60, 66],
    [70, 0, 0],
  ];
  return (
    <svg viewBox="0 0 220 64" className={RAHMEN} aria-hidden="true">
      {zeilen.map((teile, i) => {
        let x = 0;
        return (
          <g key={i} transform={`translate(0 ${6 + i * 20})`}>
            {teile.map((b, j) => {
              const rect = (
                <rect
                  key={j}
                  x={x}
                  y={0}
                  width={b}
                  height={10}
                  rx={1.5}
                  fill={["var(--dim-tech)", "var(--dim-oekon)", "var(--dim-oekol)"][j]}
                />
              );
              x += b;
              return rect;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Zwei Verläufe über einer Eingangsgröße, die sich im Kipppunkt schneiden. */
export function GrafikKipppunkt() {
  return (
    <svg viewBox="0 0 220 64" className={RAHMEN} aria-hidden="true">
      <line x1="0" y1="60" x2="220" y2="60" stroke="var(--linie-stark)" />
      <path d="M4 14 C 60 18, 110 30, 216 50" fill="none" stroke="var(--alt-intern)" strokeWidth="2" />
      <path d="M4 50 C 70 44, 120 34, 216 16" fill="none" stroke="var(--alt-extern)" strokeWidth="2" />
      <line x1="118" y1="4" x2="118" y2="60" stroke="var(--text-gedaempft)" strokeDasharray="3 3" />
      <circle cx="118" cy="33" r="4" fill="var(--flaeche)" stroke="var(--text)" strokeWidth="1.5" />
    </svg>
  );
}

/** Eine Rechenweg-Zeile mit den drei Herkunftsmarken (L), (A), (N). */
export function GrafikRechenweg() {
  const marken = [
    {
      t: "L",
      fg: "var(--herkunft-l-fg)",
      bg: "var(--herkunft-l-bg)",
      rand: "var(--herkunft-l-rand)",
    },
    {
      t: "A",
      fg: "var(--herkunft-a-fg)",
      bg: "var(--herkunft-a-bg)",
      rand: "var(--herkunft-a-rand)",
    },
    {
      t: "N",
      fg: "var(--herkunft-n-fg)",
      bg: "var(--herkunft-n-bg)",
      rand: "var(--herkunft-n-rand)",
    },
  ];
  return (
    <svg viewBox="0 0 220 64" className={RAHMEN} aria-hidden="true">
      <rect
        x="0.5"
        y="4.5"
        width="219"
        height="26"
        rx="4"
        fill="var(--flaeche-formel)"
        stroke="var(--linie)"
      />
      <rect x="10" y="14" width="44" height="6" rx="1.5" fill="var(--text-gedaempft)" opacity="0.7" />
      <rect x="62" y="14" width="70" height="6" rx="1.5" fill="var(--text-dritt)" opacity="0.5" />
      <rect x="140" y="14" width="30" height="6" rx="1.5" fill="var(--primaer)" />
      {marken.map((m, i) => (
        <g key={m.t} transform={`translate(${i * 34} 40)`}>
          <rect x="0.5" y="0.5" width="27" height="19" rx="4" fill={m.bg} stroke={m.rand} />
          <text
            x="14"
            y="14"
            textAnchor="middle"
            fontSize="11"
            fontFamily="var(--font-mono)"
            fontWeight="600"
            fill={m.fg}
          >
            {m.t}
          </text>
        </g>
      ))}
    </svg>
  );
}
