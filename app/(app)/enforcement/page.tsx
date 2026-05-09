"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EnforcementCase {
  id: string;
  platform: string;
  url: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "rejected";
  created_at: string;
}

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  facebook: "Facebook",
  twitter: "X / Twitter",
  ai_model: "AI Model / Dataset",
  website: "Website",
  other: "Other",
};

const statusColors: Record<string, string> = {
  open: "bg-amber-50 text-amber-900 border-amber-200",
  in_progress: "bg-blue-50 text-blue-900 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-900 border-emerald-200",
  rejected: "bg-red-50 text-red-900 border-red-200",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EnforcementPage() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [cases, setCases] = useState<EnforcementCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    try {
      const res = await fetch("/api/enforcement");
      const data = await res.json();
      if (data.cases) {
        setCases(data.cases);
      }
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!platform || !url) {
      setError("Platform and URL are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/enforcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url, description }),
      });
      const data = await res.json();

      if (data.success) {
        setShowReportModal(false);
        setPlatform("");
        setUrl("");
        setDescription("");
        fetchCases();
      } else {
        setError(data.error || "Failed to submit report");
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const openCases = cases.filter(c => c.status === "open");
  const inProgressCases = cases.filter(c => c.status === "in_progress");
  const resolvedCases = cases.filter(c => c.status === "resolved" || c.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enforcement</h1>
          <p className="mt-1 text-sm text-neutral-900/60">
            Track takedowns and misuse cases
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Report misuse
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm text-neutral-900/55">Open cases</p>
          <p className="mt-1 text-3xl font-semibold">{openCases.length}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm text-neutral-900/55">In progress</p>
          <p className="mt-1 text-3xl font-semibold">{inProgressCases.length}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm text-neutral-900/55">Resolved</p>
          <p className="mt-1 text-3xl font-semibold">{resolvedCases.length}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm text-neutral-900/55">Success rate</p>
          <p className="mt-1 text-3xl font-semibold">
            {resolvedCases.length > 0
              ? Math.round((resolvedCases.filter(c => c.status === "resolved").length / resolvedCases.length) * 100) + "%"
              : "—"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
        </div>
      ) : cases.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
            <svg
              className="h-7 w-7 text-neutral-900/45"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium">No enforcement cases</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-neutral-900/60">
            When you report misuse or we detect unauthorized use, cases will appear here.
          </p>
          <button
            onClick={() => setShowReportModal(true)}
            className="mt-6 rounded-lg border border-black/15 bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-900"
          >
            Report your first case
          </button>
        </div>
      ) : (
        /* Cases list */
        <div className="space-y-4">
          <h2 className="text-lg font-medium">All cases</h2>
          <div className="space-y-3">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/enforcement/${c.id}`}
                className="flex items-center gap-4 rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5">
                  <svg className="h-5 w-5 text-neutral-900/55" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{platformLabels[c.platform] || c.platform}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusColors[c.status]}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-neutral-900/55">{c.url}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs text-neutral-900/50">{c.id.substring(0, 8).toUpperCase()}</p>
                  <p className="mt-0.5 text-xs text-neutral-900/50">{formatDate(c.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-6 text-zinc-100">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Report misuse</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 outline-none"
                >
                  <option value="">Select platform</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="ai_model">AI Model / Dataset</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">URL of misuse</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how your likeness is being misused..."
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
