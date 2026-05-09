/**
 * Muhr user display id (MUID): non-sequential label derived from auth user UUID.
 * Matches sidebar: MU- + first 8 characters of the UUID string (before the first hyphen), uppercased.
 */
export function muidFromUserId(userId: string): string {
  return "MU-" + userId.substring(0, 8).toUpperCase();
}
