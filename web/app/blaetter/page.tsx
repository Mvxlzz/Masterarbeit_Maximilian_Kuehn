import { redirect } from "next/navigation";

/** Kurzpfad → Formeln der Methode (Navigation „Formel- und Datenblätter“). */
export default function BlaetterUmleitung() {
  redirect("/blaetter/methode");
}
