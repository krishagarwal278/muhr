"use client";

import { FormField } from "@/components/ui/form-field";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { outlineButtonVariants } from "@/components/ui/button-recipes";
import {
  PROFILE_LINK_PLATFORMS,
  type ProfileLinkInput,
  type ProfileLinkPlatform,
} from "@/lib/profile/links";

interface ProfileLinksEditorProps {
  value: ProfileLinkInput[];
  onChange: (next: ProfileLinkInput[]) => void;
}

const DEFAULT_PLATFORM: ProfileLinkPlatform = "instagram";

export function ProfileLinksEditor({ value, onChange }: ProfileLinksEditorProps) {
  function updateAt(index: number, next: Partial<ProfileLinkInput>) {
    const current = value[index];
    if (!current) return;
    const nextValue = [...value];
    nextValue[index] = { ...current, ...next };
    onChange(nextValue);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addLink() {
    const used = new Set(value.map((item) => item.platform));
    const firstFree = PROFILE_LINK_PLATFORMS.find((item) => !used.has(item.id));
    if (!firstFree) return;
    onChange([...value, { platform: firstFree.id, value: "" }]);
  }

  const usedPlatforms = new Set(value.map((item) => item.platform));
  const hasRoom = value.length < PROFILE_LINK_PLATFORMS.length;

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Add Instagram, YouTube, IMDb, and more so brands can find your profiles.
        </p>
      ) : null}

      {value.map((item, index) => {
        const meta = PROFILE_LINK_PLATFORMS.find((platform) => platform.id === item.platform);
        return (
          <div key={`${item.platform}-${index}`} className="rounded-lg border border-black/10 p-3">
            <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-end">
              <FormField label="Platform">
                <FormSelect
                  value={item.platform}
                  onChange={(e) => {
                    const nextPlatform = e.target.value as ProfileLinkPlatform;
                    updateAt(index, { platform: nextPlatform });
                  }}
                >
                  {PROFILE_LINK_PLATFORMS.map((platform) => (
                    <option
                      key={platform.id}
                      value={platform.id}
                      disabled={platform.id !== item.platform && usedPlatforms.has(platform.id)}
                    >
                      {platform.label}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField label="Profile URL or handle">
                <FormInput
                  value={item.value}
                  onChange={(e) => updateAt(index, { value: e.target.value })}
                  placeholder={meta?.placeholder ?? "@yourhandle"}
                />
              </FormField>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className={outlineButtonVariants({ size: "sm" })}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {hasRoom ? (
        <button type="button" onClick={addLink} className={outlineButtonVariants({ size: "sm" })}>
          Add link
        </button>
      ) : null}
    </div>
  );
}

export const DEFAULT_PROFILE_LINK: ProfileLinkInput = {
  platform: DEFAULT_PLATFORM,
  value: "",
};
