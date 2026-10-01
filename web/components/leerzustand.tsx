import type { ReactNode } from "react";
import { Boxes } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Leerzustand für Seiten ohne Projekt oder ohne Daten: gestrichelte Karte auf Punktraster
 *.
 */
export function Leerzustand({
  titel,
  text,
  icon,
  aktionen,
  className,
}: {
  titel: string;
  text: string;
  icon?: ReactNode;
  aktionen?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "leer-punkte rounded-xl border border-dashed border-border bg-card",
        className
      )}
    >
      <div className="relative flex flex-col items-center gap-1.5 px-6 py-14 text-center">
        <span className="mb-1 grid size-10 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground">
          {icon ?? <Boxes className="size-[18px]" strokeWidth={1.5} />}
        </span>
        <h2 className="text-base font-medium">{titel}</h2>
        <p className="max-w-[52ch] text-sm text-muted-foreground leading-relaxed">{text}</p>
        {aktionen && <div className="mt-3.5 flex gap-2">{aktionen}</div>}
      </div>
    </div>
  );
}
