import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { WelcomeFlow } from "./WelcomeFlow";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/welcome");

  return <WelcomeFlow userId={user.id} />;
}
