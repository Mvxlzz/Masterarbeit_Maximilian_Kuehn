import { cn } from "@/lib/utils";

/**
 * Bildmarke: der Core als Kern, darum der Kreislauf der Wiederaufbereitung aus drei Bögen in den Farben der
 * Dimensionen (technisch, ökonomisch, ökologisch). Feste Farben der dunklen Tokens, damit die Marke in beiden
 * Themes gleich aussieht. Dieselbe Zeichnung liegt als Favicon in app/icon.svg.
 */
export function Logo({ className, titel }: { className?: string; titel?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      role={titel ? "img" : undefined}
      aria-label={titel}
      aria-hidden={titel ? undefined : true}
    >
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="8"
        fill="#181a18"
        stroke="#3b3e3c"
        strokeWidth="1.5"
      />
      <g fill="none" strokeWidth="3" strokeLinecap="round">
        <path d="M16 6.8 A9.2 9.2 0 0 1 24.4 19.7" stroke="#5a8ee0" />
        <path d="M21.6 23.3 A9.2 9.2 0 0 1 7.7 20.1" stroke="#d99a36" />
        <path d="M6.8 15.2 A9.2 9.2 0 0 1 12.2 7.7" stroke="#2eb397" />
      </g>
      <circle cx="16" cy="16" r="3.4" fill="#3ecf8e" />
    </svg>
  );
}
