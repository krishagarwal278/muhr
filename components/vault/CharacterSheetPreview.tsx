"use client";

import type { CharacterSheetGenerateResponse } from "@/lib/character-sheet/types";
import { EXPORT_WIDTH, sheetTheme as t } from "@/lib/character-sheet/theme";

const STAT_LABELS: { key: keyof CharacterSheetGenerateResponse["stats"]; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "shoeSize", label: "Shoe" },
];

interface CharacterSheetPreviewProps {
  data: CharacterSheetGenerateResponse;
  aiImageUrl?: string;
}

export function CharacterSheetPreview({ data, aiImageUrl }: CharacterSheetPreviewProps) {
  const slots = [...data.photos.slice(0, 7)];
  while (slots.length < 7) {
    slots.push({ id: `empty-${slots.length}`, signedUrl: "" });
  }

  const cellStyle = (aspect: string): React.CSSProperties => ({
    position: "relative",
    aspectRatio: aspect,
    overflow: "hidden",
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    backgroundColor: t.panel,
    minHeight: 0,
  });

  return (
    <div
      data-character-sheet-preview
      className="mx-auto w-full max-w-full overflow-hidden rounded-2xl shadow-xl"
      style={{
        maxWidth: EXPORT_WIDTH,
        background: t.gradientBg,
        border: `1px solid ${t.borderStrong}`,
        color: t.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        className="relative px-5 pb-4 pt-5 sm:px-6"
        style={{
          borderBottom: `1px solid ${t.border}`,
          background: `linear-gradient(90deg, ${t.purpleGlow} 0%, transparent 50%, ${t.blueGlow} 100%)`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: t.accent }}
            >
              Character sheet
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{data.displayName}</h2>
            <p className="mt-0.5 text-xs" style={{ color: t.textDim }}>
              Brand licensing reference · Muhr Vault
            </p>
          </div>
          <span
            className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: t.success, backgroundColor: t.successBg, border: `1px solid rgba(52,211,153,0.35)` }}
          >
            Ready
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(140px,180px)_1fr] sm:p-6">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>
            Base stats
          </p>
          <div className="space-y-1.5">
            {STAT_LABELS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                style={{ backgroundColor: t.panel, border: `1px solid ${t.border}` }}
              >
                <span style={{ color: t.textMuted }}>{label}</span>
                <span className="font-mono font-semibold" style={{ color: t.text }}>
                  {data.stats[key]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {aiImageUrl ? (
          <div className="relative min-h-[200px] overflow-hidden rounded-xl" style={cellStyle("16/10")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aiImageUrl} alt="Turnaround" className="h-full w-full object-contain" crossOrigin="anonymous" />
          </div>
        ) : (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>
              Reference angles
            </p>
            <div className="grid grid-cols-4 gap-2">
              {slots.slice(0, 4).map((photo, i) => (
                <div key={photo.id} style={cellStyle("1")}>
                  {photo.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.signedUrl}
                      alt={`Angle ${i + 1}`}
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[64px] items-center justify-center" style={{ color: t.textDim }}>
                      —
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:mx-auto sm:max-w-[75%]">
              {slots.slice(4, 7).map((photo, i) => (
                <div key={photo.id} style={cellStyle("3/4")}>
                  {photo.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.signedUrl}
                      alt={`Angle ${i + 5}`}
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[80px] items-center justify-center" style={{ color: t.textDim }}>
                      —
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="border-t px-5 py-3 text-center text-[10px] sm:px-6" style={{ borderColor: t.border, color: t.textDim }}>
        Export is 1200×1040 · Encrypted copy seals separately in Vault
      </p>
    </div>
  );
}
