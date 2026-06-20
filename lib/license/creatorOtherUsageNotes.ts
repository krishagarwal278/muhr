import { createServiceRoleClient } from "@/lib/supabase/service";
import { normalizeOtherUsageNotes, OTHER_USAGE_NOTES_MAX_LENGTH } from "@/lib/format/text";

export { OTHER_USAGE_NOTES_MAX_LENGTH, normalizeOtherUsageNotes };

export async function fetchCreatorOtherUsageNotes(creatorId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("consent_rules")
    .select("other_usage_notes")
    .eq("user_id", creatorId)
    .maybeSingle();

  if (error) return null;

  return normalizeOtherUsageNotes(data?.other_usage_notes);
}
