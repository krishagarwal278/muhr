const BRAND_AVATAR_COLORS = [
  "bg-slate-800",
  "bg-violet-700",
  "bg-teal-700",
  "bg-indigo-700",
  "bg-sky-700",
  "bg-amber-700",
];

export function brandInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function brandAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BRAND_AVATAR_COLORS[Math.abs(hash) % BRAND_AVATAR_COLORS.length];
}

export function formatLicenseBudget(inr: number | null | undefined): string {
  if (inr == null || inr <= 0) return "Budget TBD";
  return `₹${inr.toLocaleString("en-IN")}`;
}
