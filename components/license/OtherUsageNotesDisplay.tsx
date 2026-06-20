export function OtherUsageNotesDisplay({
  notes,
  label = "Other usage notes",
}: {
  notes: string | null | undefined;
  label?: string;
}) {
  const text = typeof notes === "string" ? notes.trim() : "";
  if (!text) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900/85">{text}</p>
    </div>
  );
}
