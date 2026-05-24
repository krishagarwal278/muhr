import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { ProfileBasicsOnboarding } from "./ProfileBasicsOnboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <ProfileBasicsOnboarding userId={user.id} />
    </div>
  );
}
