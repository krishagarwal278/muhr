"use client";

import { useState } from "react";

type Issue = {
  id: string;
  clause?: string;
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion?: string;
  snippet?: string;
};

type ReviewResult = {
  summary: string;
  issues: Issue[];
};

export function LegalReviewModal({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);

  async function startReview() {
    setError(null);
    if (!agreed) {
      setError("Please acknowledge the disclaimer before running the review.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/licenses/incoming/${requestId}/review`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || `Server error ${res.status}`);
        setLoading(false);
        return;
      }
      setResult((json?.review ?? null) as ReviewResult | null);
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
                  {loading ? "Reviewing…" : "Run review"}
                </button>
                <button onClick={onClose} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 border">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Summary</h4>
              <p className="text-sm text-neutral-800">{result.summary}</p>

              <h4 className="mt-2 text-sm font-semibold">Issues</h4>
              <div className="space-y-2">
                {(result.issues || []).map((it: Issue) => (
                  <div key={it.id} className="rounded-md border border-black/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{it.clause ?? "General"} · {it.severity}</div>
                        <div className="mt-1 text-sm text-neutral-700">{it.message}</div>
                      </div>
                      {it.suggestion ? (
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => navigator.clipboard.writeText(it.suggestion ?? "")}
                            className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white"
                          >
                            Copy suggested clause
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {it.snippet ? <pre className="mt-2 text-xs text-neutral-600">{it.snippet}</pre> : null}
                  </div>
                ))}
              </div>

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
