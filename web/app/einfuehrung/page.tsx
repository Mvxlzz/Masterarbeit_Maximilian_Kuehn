"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { leseFortschritt } from "@/components/einfuehrung/station-seite";

/** Einstieg: setzt bei der zuletzt angesehenen Station fort, sonst Station 1. */
export default function EinfuehrungPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/einfuehrung/${leseFortschritt().zuletzt}`);
  }, [router]);
  return null;
}
