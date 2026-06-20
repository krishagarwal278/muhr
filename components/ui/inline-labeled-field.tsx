export function InlineLabeledField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-neutral-950">{label}</p>
        {hint ? <p className="text-xs text-neutral-600">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
