"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultContractDocFromRequest } from "@/lib/license/defaultContractDoc";
import { primaryButtonVariants } from "@/components/ui/button-recipes";
import type { LicenseRequestRow } from "@/types/license";
import "./contract-editor.css";

const backupKey = (requestId: string) => `vawlt-license-contract-backup:${requestId}`;

function isDocRoot(v: unknown): v is JSONContent {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    (v as { type?: string }).type === "doc"
  );
}

export function LicenseContractEditor({
  request,
  readOnly = false,
  onRequestUpdated,
}: {
  request: LicenseRequestRow;
  /** Brand workspace: view + export only (no server saves from this session). */
  readOnly?: boolean;
  onRequestUpdated: (next: LicenseRequestRow) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfCaptureRef = useRef<HTMLDivElement>(null);
  const dirtySinceSave = useRef(false);
  const restoredRef = useRef(false);

  const initialDoc: JSONContent = useMemo(() => {
    if (request.contract_body && typeof request.contract_body === "object") {
      return request.contract_body as JSONContent;
    }
    return defaultContractDocFromRequest({
      brand_name: request.brand_name,
      brand_company: request.brand_company,
      intended_use: request.intended_use,
      duration_days: request.duration_days,
      budget_inr: request.budget_inr,
      channels: request.channels ?? [],
      territories: request.territories ?? [],
    });
  }, [
    request.contract_body,
    request.brand_name,
    request.brand_company,
    request.intended_use,
    request.duration_days,
    request.budget_inr,
    request.channels,
    request.territories,
  ]);

  const persist = useCallback(
    async (doc: JSONContent): Promise<boolean> => {
      if (readOnly) return false;
      setSaveState("saving");
      setSaveError(null);
      try {
        const res = await fetch(`/api/licenses/incoming/${request.id}/contract`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", contract_body: doc }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          request?: LicenseRequestRow;
        };
        if (!res.ok) {
          setSaveState("error");
          const msg =
            typeof data.error === "string" && data.error.trim().length > 0
              ? data.error
              : "We couldn’t save your changes. Please try again in a moment.";
          setSaveError(msg);
          return false;
        }
        if (data.request) {
          onRequestUpdated(data.request);
          const updated = data.request;
          try {
            const at = updated.contract_updated_at
              ? new Date(updated.contract_updated_at).getTime()
              : Date.now();
            localStorage.setItem(
              backupKey(request.id),
              JSON.stringify({ doc, at, source: "server" })
            );
          } catch {
            // ignore quota
          }
        }
        dirtySinceSave.current = false;
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1600);
        return true;
      } catch {
        setSaveState("error");
        setSaveError("Network error — check your connection and try again.");
        return false;
      }
    },
    [request.id, onRequestUpdated, readOnly]
  );

  const scheduleSave = useCallback(
    (doc: JSONContent) => {
      if (readOnly) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(doc);
      }, 1400);
    },
    [persist, readOnly]
  );

  const scheduleLocalBackup = useCallback((doc: JSONContent) => {
    if (readOnly) return;
    if (backupTimer.current) clearTimeout(backupTimer.current);
    backupTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          backupKey(request.id),
          JSON.stringify({ doc, at: Date.now(), source: "local" })
        );
      } catch {
        // ignore
      }
    }, 600);
  }, [request.id, readOnly]);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [StarterKit],
      content: initialDoc,
      editable: !readOnly,
      editorProps: {
        attributes: {
          class: "tiptap",
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (readOnly) return;
        dirtySinceSave.current = true;
        const json = ed.getJSON();
        scheduleLocalBackup(json);
        scheduleSave(json);
      },
    },
    [mounted, request.id]
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || restoredRef.current) return;
    restoredRef.current = true;
    queueMicrotask(() => {
      if (readOnly) return;
      try {
        const raw = localStorage.getItem(backupKey(request.id));
        if (!raw) return;
        const parsed = JSON.parse(raw) as { doc?: unknown; at?: number; source?: string };
        if (!isDocRoot(parsed.doc)) return;
        const localAt = typeof parsed.at === "number" ? parsed.at : 0;
        const serverAt = request.contract_updated_at
          ? new Date(request.contract_updated_at).getTime()
          : 0;
        if (parsed.source === "local" && localAt > serverAt) {
          editor.commands.setContent(parsed.doc, { emitUpdate: false });
          dirtySinceSave.current = true;
          setRestoredNotice(true);
        }
      } catch {
        // ignore corrupt backup
      }
    });
  }, [editor, request.id, request.contract_updated_at, readOnly]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (backupTimer.current) clearTimeout(backupTimer.current);
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (readOnly) return;
      if (dirtySinceSave.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [readOnly]);

  async function saveNow() {
    if (readOnly || !editor) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await persist(editor.getJSON());
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportHtml() {
    if (!editor) return;
    const html = editor.getHTML();
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>License contract</title></head><body>${html}</body></html>`,
      ],
      { type: "text/html;charset=utf-8" }
    );
    downloadBlob("license-contract.html", blob);
  }

  function exportTxt() {
    if (!editor) return;
    const blob = new Blob([editor.getText()], { type: "text/plain;charset=utf-8" });
    downloadBlob("license-contract.txt", blob);
  }

  async function exportDocx() {
    if (!editor) return;
    const lines = editor.getText().split(/\n/);
    const children = lines.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line.length ? line : " " })],
        })
    );
    const doc = new Document({
      sections: [{ children }],
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob("license-contract.docx", blob);
  }

  async function exportPdf() {
    if (!editor || !pdfCaptureRef.current) return;
    const html = editor.getHTML();
    pdfCaptureRef.current.innerHTML = html;
    const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const html2canvas = html2canvasMod.default;
    const el = pdfCaptureRef.current;
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(imgData, "JPEG", (pdfW - w) / 2, (pdfH - h) / 2, w, h);
    pdf.save("license-contract.pdf");
  }

  function printContract() {
    if (!editor) return;
    const html = editor.getHTML();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>License contract</title><style>body{font-family:system-ui,sans-serif;padding:32px;max-width:720px;margin:0 auto;color:#111;line-height:1.55}h1,h2,h3{color:#000}</style></head><body>${html}</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  }

  if (!mounted || !editor) {
    return (
      <div className="h-48 animate-pulse rounded-xl border border-black/10 bg-neutral-100" aria-hidden />
    );
  }

  return (
    <div className="space-y-4">
      {restoredNotice && !readOnly ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          Restored a newer draft from this browser (it had not been saved to the server yet). Use{" "}
          <span className="font-medium">Save now</span> to sync.
        </p>
      ) : null}

      {saveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-950">
          <p>{saveError}</p>
          <p className="mt-1 text-xs text-red-900/80">
            Your edits are kept locally in this browser, so you won’t lose them. Try{" "}
            <span className="font-medium">Save now</span> again — if the problem persists, our team has
            already been alerted.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 pb-3">
        {!readOnly ? (
          <>
            <span className="text-xs font-medium text-neutral-700">Format</span>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Bold
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Italic
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
            >
              List
            </button>
            <span className="mx-1 hidden h-4 w-px bg-black/10 sm:inline" aria-hidden />
          </>
        ) : (
          <span className="text-xs font-medium text-neutral-600">Read-only</span>
        )}
        <span className="w-full text-xs font-medium text-neutral-700 sm:w-auto">Export</span>
        <button
          type="button"
          onClick={() => exportHtml()}
          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-neutral-900 hover:bg-neutral-50"
        >
          HTML
        </button>
        <button
          type="button"
          onClick={() => void exportDocx()}
          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-neutral-900 hover:bg-neutral-50"
        >
          Word
        </button>
        <button
          type="button"
          onClick={() => exportTxt()}
          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-neutral-900 hover:bg-neutral-50"
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => void exportPdf()}
          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-neutral-900 hover:bg-neutral-50"
        >
          PDF
        </button>
        <button
          type="button"
          onClick={() => printContract()}
          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-neutral-900 hover:bg-neutral-50"
        >
          Print
        </button>
        <span className="mx-1 hidden h-4 w-px bg-black/10 sm:inline" aria-hidden />
        {!readOnly ? (
          <>
            <button
              type="button"
              disabled={saveState === "saving"}
              onClick={() => void saveNow()}
              className={primaryButtonVariants({ size: "sm" })}
            >
              {saveState === "saving" ? "Saving…" : "Save now"}
            </button>
            <span className="ml-auto max-w-[min(100%,14rem)] text-right text-xs text-neutral-700 sm:max-w-[20rem]">
              {saveState === "saving"
                ? "Saving to server…"
                : saveState === "saved"
                  ? "Saved to server"
                  : saveState === "error"
                    ? "Save failed — fix above or use Export"
                    : "Autosaves ~1.5s after you stop typing; also backed up in this browser"}
            </span>
          </>
        ) : null}
      </div>

      <div className="tiptap-editor-shell rounded-lg border border-black/10 bg-white">
        <EditorContent editor={editor} />
      </div>

      <div className="pointer-events-none fixed left-[-9999px] top-0 overflow-hidden" aria-hidden>
        <div ref={pdfCaptureRef} className="contract-export-capture" />
      </div>

      <div className="border-t border-black/10 pt-4 text-sm text-neutral-900/65">
        <p>
          {readOnly ? (
            <>
              This is the creator&apos;s draft (read-only here). Use <span className="font-medium text-neutral-950">Export</span>{" "}
              for your records.
            </>
          ) : (
            <>
              Edit this draft in Muhr, <span className="font-medium text-neutral-950">Save now</span> to store it in your
              account, and <span className="font-medium text-neutral-950">export Word or PDF</span> for legal review and
              signing outside Muhr (e-sign tool, counsel, or wet ink). Share the final agreement with{" "}
              <span className="font-medium text-neutral-950">{request.brand_name}</span> by email or your own process — in-app
              brand signing is no longer used.
            </>
          )}
        </p>
        {!readOnly ? (
          <p className="mt-2 text-xs leading-relaxed text-neutral-700">
            Drafts auto-save as you edit. We also keep a local backup in this browser, so you won’t
            lose work if the network drops mid-edit.
          </p>
        ) : null}
      </div>
    </div>
  );
}
