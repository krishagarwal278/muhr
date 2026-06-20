import { FormField } from "@/components/ui/form-field";
import { FormTextarea } from "@/components/ui/form-textarea";
import { ToggleField } from "@/components/ui/toggle";
import { OTHER_USAGE_NOTES_MAX_LENGTH } from "@/lib/format/text";

export function OtherUsageRuleSection({
  allowOther,
  notes,
  onAllowOtherChange,
  onNotesChange,
  copy,
}: {
  allowOther: boolean;
  notes: string | null;
  onAllowOtherChange: (checked: boolean) => void;
  onNotesChange: (value: string | null) => void;
  copy: {
    toggleLabel: string;
    toggleHint: string;
    notesLabel: string;
    notesHint: string;
    notesPlaceholder: string;
  };
}) {
  return (
    <div className="space-y-4 border-t border-black/10 pt-4">
      <ToggleField
        label={copy.toggleLabel}
        description={copy.toggleHint}
        checked={allowOther}
        onChange={onAllowOtherChange}
      />
      <FormField label={copy.notesLabel} description={copy.notesHint}>
        <FormTextarea
          rows={4}
          maxLength={OTHER_USAGE_NOTES_MAX_LENGTH}
          value={notes ?? ""}
          placeholder={copy.notesPlaceholder}
          onChange={(e) => onNotesChange(e.target.value.trim() ? e.target.value : null)}
        />
      </FormField>
    </div>
  );
}
