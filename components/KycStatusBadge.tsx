import type { KycStatus } from "@/types";

function label(status: KycStatus): string {
  switch (status) {
    case "verified":
      return "Identity verified";
    case "pending":
      return "Verification pending";
    case "failed":
      return "Verification failed";
    default:
      return "Identity not verified";
  }
}

export function KycStatusBadge({
  status,
  className = "",
}: {
  status: KycStatus;
  className?: string;
}) {
  const verified = status === "verified";
  const failed = status === "failed";
  const pending = status === "pending";

  const styles = verified
    ? "border-emerald-600/25 bg-emerald-50 text-emerald-900"
    : failed
      ? "border-red-500/30 bg-red-50 text-red-900"
      : pending
        ? "border-amber-500/40 bg-amber-50 text-amber-950"
        : "border-amber-500/40 bg-amber-50 text-amber-950";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles} ${className}`}
      role="status"
      aria-label={label(status)}
    >
      {verified ? (
        <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className={`h-3.5 w-3.5 shrink-0 ${failed ? "text-red-600" : "text-amber-700"}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      )}
      {label(status)}
    </span>
  );
}