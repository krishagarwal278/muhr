import { redirect } from "next/navigation";

export default function ConsentPage() {
  redirect("/licenses?tab=rules-and-rates");
}
