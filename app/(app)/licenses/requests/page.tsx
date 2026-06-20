import { redirect } from "next/navigation";

export default function LicenseRequestsPage() {
  redirect("/licenses?tab=inbox");
}
