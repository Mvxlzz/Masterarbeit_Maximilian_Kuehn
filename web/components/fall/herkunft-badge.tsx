"use client";

import { Badge } from "@/components/ui/badge";
import type { Herkunft } from "@/lib/fall";
import { cn } from "@/lib/utils";

const TITEL: Record<Herkunft, string> = {
  L: "Literatur",
  A: "Annahme",
  N: "Nutzerangabe",
};

export function HerkunftBadge({ herkunft }: { herkunft: Herkunft }) {
  return (
    <Badge
      variant="outline"
      title={TITEL[herkunft]}
      className={cn(
        "font-mono text-[11px]",
        herkunft === "L" && "border-sky-500/40 text-sky-700 dark:text-sky-300",
        herkunft === "A" && "border-violet-500/40 text-violet-700 dark:text-violet-300",
        herkunft === "N" && "border-amber-500/40 text-amber-700 dark:text-amber-300"
      )}
    >
      {herkunft}
    </Badge>
  );
}
