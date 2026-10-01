"use client";

import { use } from "react";

import { StationSeite } from "@/components/einfuehrung/station-seite";

/** Eine Station der Einführung je Adresse: /einfuehrung/1 bis /einfuehrung/10. */
export default function EinfuehrungStationPage({ params }: { params: Promise<{ nr: string }> }) {
  const { nr } = use(params);
  return <StationSeite nr={Number(nr)} />;
}
