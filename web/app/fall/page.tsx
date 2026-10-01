import { redirect } from "next/navigation";

/** Kurzpfad → Datenblatt (SEITEN in werkzeuge/screenshots_web.py). */
export default function FallUmleitung() {
  redirect("/fall/datenblatt");
}
