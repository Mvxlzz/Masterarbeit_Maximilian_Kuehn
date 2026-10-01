"use client";

import {
  farbeAlternative,
  formAlternative,
  type AltForm,
  type AltInfo,
} from "@/lib/sensitivitaet";

function FormSymbol({
  form,
  farbe,
  size = 10,
}: {
  form: AltForm;
  farbe: string;
  size?: number;
}) {
  const s = size;
  if (form === "kreis") {
    return (
      <svg width={s} height={s} aria-hidden="true">
        <circle cx={s / 2} cy={s / 2} r={s / 2 - 0.5} fill={farbe} />
      </svg>
    );
  }
  if (form === "quadrat") {
    return (
      <svg width={s} height={s} aria-hidden="true">
        <rect x={1} y={1} width={s - 2} height={s - 2} fill={farbe} />
      </svg>
    );
  }
  if (form === "dreieck") {
    const tip = `${s / 2},1`;
    const bl = `1,${s - 1}`;
    const br = `${s - 1},${s - 1}`;
    return (
      <svg width={s} height={s} aria-hidden="true">
        <polygon points={`${tip} ${bl} ${br}`} fill={farbe} />
      </svg>
    );
  }
  if (form === "raute") {
    const mid = s / 2;
    return (
      <svg width={s} height={s} aria-hidden="true">
        <polygon
          points={`${mid},1 ${s - 1},${mid} ${mid},${s - 1} 1,${mid}`}
          fill={farbe}
        />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} aria-hidden="true">
      <circle cx={s / 2} cy={s / 2} r={2} fill={farbe} />
    </svg>
  );
}

/** Zeichnet Form + Farbe einer Alternative an gegebene SVG-Koordinaten (für Diagramme). */
export function AltMarkierung({
  schluessel,
  x,
  y,
  size = 8,
  offen = false,
  alle,
}: {
  schluessel: string | null;
  x: number;
  y: number;
  size?: number;
  offen?: boolean;
  alle?: string[];
}) {
  if (!schluessel) return null;
  const farbe = farbeAlternative(schluessel, alle);
  const form = formAlternative(schluessel);
  const stroke = offen ? farbe : "none";
  const fill = offen ? "none" : farbe;
  const sw = offen ? 1.5 : 0;

  if (form === "kreis") {
    return (
      <circle
        cx={x}
        cy={y}
        r={size / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    );
  }
  if (form === "quadrat") {
    return (
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    );
  }
  if (form === "dreieck") {
    const h = size;
    const points = `${x},${y - h / 2} ${x - h / 2},${y + h / 2} ${x + h / 2},${y + h / 2}`;
    return (
      <polygon points={points} fill={fill} stroke={stroke} strokeWidth={sw} />
    );
  }
  if (form === "raute") {
    const h = size / 2;
    const points = `${x},${y - h} ${x + h},${y} ${x},${y + h} ${x - h},${y}`;
    return (
      <polygon points={points} fill={fill} stroke={stroke} strokeWidth={sw} />
    );
  }
  return <circle cx={x} cy={y} r={2.5} fill={farbe} />;
}

export function AlternativenLegende({
  alternativen,
}: {
  alternativen: AltInfo[];
}) {
  const alle = alternativen.map((a) => a.schluessel);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {alternativen.map((a) => (
        <li key={a.schluessel} className="inline-flex items-center gap-1.5">
          <FormSymbol
            form={formAlternative(a.schluessel)}
            farbe={farbeAlternative(a.schluessel, alle)}
          />
          {a.name}
        </li>
      ))}
    </ul>
  );
}

export { FormSymbol };
