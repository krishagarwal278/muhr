export type CancellationReasonKey =
  | "brand_violation"
  | "stopped_paying"
  | "personal"
  | "content_unavailable"
  | "relationship_ended"
  | "other";

export const CANCELLATION_REASON_OPTIONS: { key: CancellationReasonKey; label: string }[] = [
  { key: "brand_violation", label: "Brand violated terms of use" },
  { key: "stopped_paying", label: "Brand is having payment issues" },
  { key: "personal", label: "Personal decision" },
  { key: "content_unavailable", label: "Content no longer available" },
  { key: "relationship_ended", label: "Brand relationship ended" },
  { key: "other", label: "Other (please specify)" },
];

export function cancellationReasonLabel(key: string | null | undefined): string {
  if (!key) return "—";
  const row = CANCELLATION_REASON_OPTIONS.find((o) => o.key === key);
  return row?.label ?? key;
}

export function isCancellationReasonKey(v: string): v is CancellationReasonKey {
  return CANCELLATION_REASON_OPTIONS.some((o) => o.key === v);
}
