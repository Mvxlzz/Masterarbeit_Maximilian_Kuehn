"use client";

import katex from "katex";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

/** Rendert LaTeX rein zur Anzeige (KaTeX). Rechnet nichts, zeigt nur, was der Kern geliefert hat. */
export function Katex({
  children,
  display = false,
  className,
}: {
  children: string;
  display?: boolean;
  className?: string;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children || "", {
        throwOnError: false,
        displayMode: display,
      });
    } catch {
      return null;
    }
  }, [children, display]);
  // Scheitert KaTeX, steht der Quelltext als Text da, nie als HTML (er kann aus einer importierten Fall-Datei stammen)
  if (html === null) return <span className={cn(className)}>{children}</span>;
  return (
    <span className={cn(className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
