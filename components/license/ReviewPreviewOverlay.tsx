"use client";

import { useEffect } from "react";

export default function ReviewPreviewOverlay({
  editorSelector,
  proposedText,
  snippet,
  onClose,
}: {
  editorSelector: string;
  proposedText: string;
  snippet?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    // find editor element
    const el = document.querySelector(editorSelector) as HTMLElement | null;
    if (!el) return;

    // add pulsing border
    el.classList.add("muhr-editor-pulse");

    const overlay = document.createElement("div");
    overlay.className = "muhr-review-overlay";
    overlay.style.position = "absolute";
    const rect = el.getBoundingClientRect();
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${Math.min(rect.height, 360)}px`;
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9999";
    overlay.innerHTML = `
      <div class="muhr-overlay-inner">
        <div class="muhr-magic-entrance">🪄</div>
        <div class="muhr-improved-text">
          <div class="muhr-improved-title">Improved text preview</div>
          <pre class="muhr-improved-body">${escapeHtml(proposedText)}</pre>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const timeout = setTimeout(() => {
      el.classList.remove("muhr-editor-pulse");
      overlay.remove();
      onClose();
    }, 5000);

    return () => {
      clearTimeout(timeout);
      el.classList.remove("muhr-editor-pulse");
      overlay.remove();
    };
  }, [editorSelector, proposedText, snippet, onClose]);

  return null;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
