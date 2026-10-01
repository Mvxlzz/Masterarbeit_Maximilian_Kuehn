import { redirect } from "next/navigation";

/** Kurzpfad → Szenario-Matrix (Navigation „Szenarien“). */
export default function SzenarienUmleitung() {
  redirect("/szenarien/matrix");
}
