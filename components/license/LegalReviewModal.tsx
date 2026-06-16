"use client";

import { useState } from "react";

type Issue = {
  severity: "low" | "medium" | "high";
  clause: string;
  problem: string;
  whyItMatters: string;
  suggestedFix: string;
  snippet?: string | null;
};

type SuggestedEdit = {
  currentText?: string;
  proposedText: string;
  reason: string;
};

type LegalReviewResult = {
  overallRisk: "low" | "medium" | "high";
  summary: string;
  issues: Issue[];
  missingClauses: string[];
  riskyClauses: string[];
  suggestedEdits: SuggestedEdit[];
  disclaimer: string;
};

export function LegalReviewModal({
  requestId,
  contractText,
  onClose,
  onPreview,
}: {
  requestId: string;
  contractText?: unknown;
  onClose: () => void;
  onPreview?: (proposedText: string, snippet?: string | null) => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LegalReviewResult | null>(null);

  async function startReview() {
    setError(null);
    if (!agreed) {
      setError("Please acknowledge the disclaimer before running the review.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/licenses/incoming/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          contractText !== undefined && contractText !== null ? { contract_text: contractText } : {}
        ),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || `Server error ${res.status}`);
        setLoading(false);
        return;
      }
      setResult((json?.review ?? null) as LegalReviewResult | null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">AI Legal Review</h3>
          <button onClick={onClose} className="text-sm text-neutral-600">Close</button>
        </div>

        <div className="mt-4 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-neutral-700">
                This tool provides an automated review only. It is not legal advice. By continuing you agree that
                this is not a substitute for consulting a licensed attorney.
              </p>

              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span className="text-sm">I understand and accept this disclaimer</span>
              </label>

              {error ? <p className="text-sm text-red-700">{error}</p> : null}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={startReview}
                  disabled={loading}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "Reviewing\u001f" : "Run review"}
                </button>
                <button onClick={onClose} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 border">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Summary</h4>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${result.overallRisk === 'high' ? 'bg-red-100 text-red-800' : result.overallRisk === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {result.overallRisk.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-neutral-800">{result.summary}</p>

              <h4 className="mt-2 text-sm font-semibold">Issues</h4>
              <div className="space-y-2">
                {(result.issues || []).map((it, i) => (
                  <div key={`${it.clause}-${i}`} className="rounded-md border border-black/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{it.clause} \u001f {it.severity}</div>
                        <div className="mt-1 text-sm text-neutral-700">{it.problem}</div>
                        <div className="mt-1 text-xs text-neutral-600"><strong>Why it matters:</strong> {it.whyItMatters}</div>
                      </div>
                      {it.suggestedFix ? (
                        <div className="ml-4 flex-shrink-0 flex flex-col gap-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(it.suggestedFix ?? "")}
                            className="rounded-md bg-pink-600 px-2 py-1 text-xs font-medium text-white"
                          >
                            \u001f\u001f \u001f\u001f Copy suggested clause
                          </button>
                          <button
                            onClick={() => onPreview?.(it.suggestedFix ?? "", it.snippet ?? null)}
                            className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white"
                          >
                            Preview \u001f\u001f 
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {result.missingClauses && result.missingClauses.length ? (
                <div className="mb-3">
                  <h5 className="text-sm font-medium">Missing clauses</h5>
                  <ul className="list-disc ml-5 text-sm text-neutral-700">
                    {result.missingClauses.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              ) : null}

              {result.riskyClauses && result.riskyClauses.length ? (
                <div className="mb-3">
                  <h5 className="text-sm font-medium">Risky clauses</h5>
                  <ul className="list-disc ml-5 text-sm text-neutral-700">
                    {result.riskyClauses.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              ) : null}

              {result.suggestedEdits && result.suggestedEdits.length ? (
                <div className="mb-3">
                  <h5 className="text-sm font-medium">Suggested edits</h5>
                  <div className="space-y-2">
                    {result.suggestedEdits.map((e, i) => (
                      <div key={i} className="rounded-md border p-2">
                        <div className="text-sm font-semibold">{e.reason}</div>
                        <pre className="text-xs mt-1 text-neutral-700">{e.proposedText}</pre>
                        <div className="mt-1">
                          <button onClick={() => navigator.clipboard.writeText(e.proposedText)} className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white">Copy</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex justify-end">
                <button onClick={onClose} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 border">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
