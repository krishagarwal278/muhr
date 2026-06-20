import { redirect } from "next/navigation";

export default function ConsentHistoryPage() {
  redirect("/licenses?tab=rules-and-rates");
}
