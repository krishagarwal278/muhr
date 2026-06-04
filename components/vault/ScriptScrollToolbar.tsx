"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

function ToolbarIconButton({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex h-9 w-9 items-center justify-center rounded-lg text-neutral-200 transition",
        "hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-white/15 text-white"
      )}
    >
      {children}
    </button>
  );
}

function IconPlay() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.01-7.36a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" />
    </svg>
  );
}

function IconTop() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 8.25m0 0 7.5 7.5M12 8.25V21" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

export function ScriptScrollToolbar({
  autoScrollPaused,
  onToggleAutoscroll,
  onScrollToTop,
  onStop,
  showStop,
  stopDisabled,
  recordingLabel,
}: {
  autoScrollPaused: boolean;
  onToggleAutoscroll: () => void;
  onScrollToTop: () => void;
  onStop?: () => void;
  showStop?: boolean;
  stopDisabled?: boolean;
  recordingLabel?: string | null;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t border-white/10 bg-neutral-950/95 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <ToolbarIconButton title="Back to top" onClick={onScrollToTop}>
          <IconTop />
        </ToolbarIconButton>
        <ToolbarIconButton
          title={autoScrollPaused ? "Resume autoscroll" : "Pause autoscroll"}
          onClick={onToggleAutoscroll}
          active={!autoScrollPaused}
        >
          {autoScrollPaused ? <IconPlay /> : <IconPause />}
        </ToolbarIconButton>
        {showStop && onStop ? (
          <ToolbarIconButton title="Stop recording" onClick={onStop} disabled={stopDisabled}>
            <IconStop />
          </ToolbarIconButton>
        ) : null}
      </div>
      {recordingLabel ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          {recordingLabel}
        </span>
      ) : null}
    </div>
  );
}
