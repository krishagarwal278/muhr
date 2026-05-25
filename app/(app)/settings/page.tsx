import { redirect } from "next/navigation";

/** Legacy URL — profile settings live at /profile. */
export default function SettingsRedirectPage() {
  redirect("/profile");
}
