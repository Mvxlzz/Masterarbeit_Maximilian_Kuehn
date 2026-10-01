"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Video der Landing Page: Aufnahme der echten Anwendung (werkzeuge/landing_video.py), stumm in Schleife.
 * `children` steht direkt unter dem Video (Dimensionsbalken).
 * Bei reduzierter Bewegung läuft nichts von selbst: Standbild, Abspielen über die Steuerleiste.
 */
const RUHIG = "(prefers-reduced-motion: reduce)";

function ruhigAbonnieren(melden: () => void) {
  const abfrage = window.matchMedia(RUHIG);
  abfrage.addEventListener("change", melden);
  return () => abfrage.removeEventListener("change", melden);
}

export function LandingVideo({ className, children }: { className?: string; children?: ReactNode }) {
  const ruhig = useSyncExternalStore(
    ruhigAbonnieren,
    () => window.matchMedia(RUHIG).matches,
    () => false,
  );
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (ruhig) v.pause();
    else v.play().catch(() => {});
  }, [ruhig]);

  return (
    <figure className={cn("m-0", className)}>
      <video
        ref={video}
        key={String(ruhig)}
        className="block aspect-[16/10] w-full rounded-[10px] border border-[var(--linie-stark)] bg-[var(--flaeche-seite)] object-cover object-top shadow-[0_24px_60px_-28px_var(--schatten-menue)]"
        poster="/landing/poster.png"
        muted
        loop
        playsInline
        autoPlay={!ruhig}
        controls={ruhig}
        preload="auto"
        aria-label="Kurzes Video: Projekt öffnen, Ergebnis mit Rangfolge und Beitrag je Dimension, Tornado der Sensitivität"
      >
        <source src="/landing/aufnahme.webm" type="video/webm" />
      </video>
      {children}
    </figure>
  );
}
