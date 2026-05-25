"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { canUseInAppLicenseMessaging } from "@/lib/license/workspaceMessages";
import { apiErrorMessage, dataFromApiJson } from "@/lib/api/response";
import { solidButtonVariants } from "@/components/ui/button-recipes";

type ConversationRow = {
  id: string;
  status: string;
  my_role: "creator" | "brand";
  brand_user_id: string | null;
  counterparty_label: string;
  counterparty_detail: string;
  workspace_href: string;
  last_message_body: string | null;
  last_message_at: string | null;
  last_author_role: string | null;
  has_unread_hint: boolean;
  /** Brand: one chat per creator; messages may span multiple license_request rows. */
  merged_request_ids?: string[];
};

type ThreadMsg = {
  id: string;
  author_role: string;
  body: string;
  created_at: string;
  license_request_id?: string;
};

const FETCH_TIMEOUT_MS = 15_000;

function isOutgoingMessage(authorRole: string, myRole: "creator" | "brand"): boolean {
  return authorRole === myRole;
}

function listPreviewText(c: ConversationRow): string {
  if (!c.last_message_body) return "No messages yet — say hello";
  if (c.last_author_role && c.last_author_role === c.my_role) {
    return `You: ${c.last_message_body}`;
  }
  return c.last_message_body;
}

function SentCheckIcon({ className, title = "Sent" }: { className?: string; title?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={title}
      role="img"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(tid);
  }
}

export function GlobalLicenseMessagesDock() {
  const [mounted, setMounted] = useState(false);
  /** Hide entirely for signed-out users after first probe. */
  const [gate, setGate] = useState<"loading" | "in" | "out">("loading");
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"list" | "thread">("list");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [active, setActive] = useState<ConversationRow | null>(null);
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetchWithTimeout("/api/licenses/messages/conversations");
      if (res.status === 401) {
        setGate("out");
        setConversations([]);
        return;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setListError(apiErrorMessage(json, "Could not load messages"));
        setGate("in");
        return;
      }
      const data = dataFromApiJson<{ conversations?: ConversationRow[] }>(json);
      if (Array.isArray(data?.conversations)) {
        setConversations(data.conversations);
      }
      setGate("in");
    } catch (e) {
      setListError(e instanceof Error && e.name === "AbortError" ? "Request timed out." : "Network error.");
      setGate("in");
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (c: ConversationRow, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setThreadLoading(true);
    try {
      let res: Response;
      if (c.merged_request_ids && c.merged_request_ids.length > 1) {
        const qs = new URLSearchParams();
        qs.set("request_ids", c.merged_request_ids.join(","));
        res = await fetchWithTimeout(`/api/licenses/messages/merged?${qs.toString()}`);
      } else {
        res = await fetchWithTimeout(`/api/licenses/workspace/${c.id}?embed=messages`);
      }
      if (!res.ok) {
        if (!silent) setThread([]);
        return;
      }
      const json = await res.json().catch(() => null);
      const data = dataFromApiJson<{ messages?: ThreadMsg[] }>(json);
      if (Array.isArray(data?.messages)) {
        setThread(data.messages);
      } else if (!silent) {
        setThread([]);
      }
    } catch {
      if (!silent) setThread([]);
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadConversations();
  }, [mounted, loadConversations]);

  useEffect(() => {
    if (!expanded || view !== "thread" || !active) return;
    void loadThread(active);
    const t = setInterval(() => void loadThread(active, { silent: true }), 45_000);
    return () => clearInterval(t);
  }, [expanded, view, active, loadThread]);

  useEffect(() => {
    if (!expanded) return;
    const t = setInterval(() => void loadConversations(), 60_000);
    return () => clearInterval(t);
  }, [expanded, loadConversations]);

  useEffect(() => {
    if (!expanded) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = panelRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        const t = e.target as HTMLElement;
        if (t.closest("[data-license-messages-launcher]")) return;
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [expanded]);

  const unreadCount = conversations.filter((c) => c.has_unread_hint).length;

  async function sendFromDock() {
    if (!active || !canUseInAppLicenseMessaging({ status: active.status })) return;
    const text = composer.trim();
    if (text.length < 1) return;
    setSendBusy(true);
    try {
      const res = await fetchWithTimeout(`/api/licenses/workspace/${active.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setListError(apiErrorMessage(json, "Send failed"));
        return;
      }
      setComposer("");
      await loadThread(active, { silent: true });
      void loadConversations();
    } catch (e) {
      setListError(e instanceof Error && e.name === "AbortError" ? "Request timed out." : "Network error.");
    } finally {
      setSendBusy(false);
    }
  }

  if (!mounted || gate === "loading" || gate === "out") return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-overlay flex flex-col items-end gap-2">
      {expanded ? (
        <div
          ref={panelRef}
          className="pointer-events-auto flex h-[min(520px,calc(100vh-6rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-neutral-200/90 bg-white px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {view === "thread" ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("list");
                    setActive(null);
                  }}
                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 hover:text-neutral-950"
                  aria-label="Back to conversations"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
              ) : null}
              <h2 className="truncate text-sm font-semibold text-neutral-950">
                {view === "thread" ? active?.counterparty_label ?? "Chat" : "Messages"}
              </h2>
              {view === "list" && unreadCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-black/5 hover:text-neutral-950"
                aria-label="Minimize"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                </svg>
              </button>
            </div>
          </header>

          {listError ? (
            <p className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {listError}
            </p>
          ) : null}

          {view === "list" ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {listLoading && conversations.length === 0 ? (
                <div className="space-y-2 p-3">
                  <div className="h-12 animate-pulse rounded-lg bg-neutral-100" />
                  <div className="h-12 animate-pulse rounded-lg bg-neutral-100" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-neutral-600">
                  <p>No license threads yet.</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    After you send or receive a request, you can message here—even before it is accepted.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {conversations.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setListError(null);
                          setActive(c);
                          setView("thread");
                          void loadThread(c);
                        }}
                        className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-neutral-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 text-xs font-semibold text-neutral-700">
                          {c.counterparty_label.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium text-neutral-950">{c.counterparty_label}</p>
                            {c.last_message_at ? (
                              <span className="shrink-0 text-[11px] text-neutral-500">
                                {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-neutral-500">{c.counterparty_detail}</p>
                          <p
                            className={cx(
                              "mt-0.5 truncate text-xs",
                              c.last_author_role === c.my_role ? "text-neutral-500" : "text-neutral-700"
                            )}
                          >
                            {listPreviewText(c)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cx(
                                "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                c.status === "accepted"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                  : c.status === "pending"
                                    ? "border-amber-200 bg-amber-50 text-amber-950"
                                    : "border-neutral-200 bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {c.status}
                            </span>
                            {c.has_unread_hint ? (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" title="New activity" />
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
                {active ? (
                  <Link
                    href={active.workspace_href}
                    className="mb-2 inline-block text-xs font-medium text-emerald-800 underline-offset-2 hover:underline"
                  >
                    Open full license workspace →
                  </Link>
                ) : null}
                {threadLoading ? (
                  <div className="space-y-2 py-4">
                    <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
                    <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
                  </div>
                ) : (
                  <ul className="space-y-2.5 pb-2">
                    {thread.length === 0 ? (
                      <li className="py-6 text-center text-sm text-neutral-500">No messages yet.</li>
                    ) : (
                      thread.map((m) => {
                        const myRole = active?.my_role ?? "creator";
                        const outgoing = isOutgoingMessage(m.author_role, myRole);
                        return (
                          <li
                            key={m.id}
                            className={cx("flex w-full", outgoing ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cx(
                                "relative max-w-[88%] min-w-0 px-3 py-2 text-sm shadow-sm",
                                outgoing
                                  ? "rounded-2xl rounded-br-sm bg-neutral-200 text-neutral-900"
                                  : "rounded-2xl rounded-bl-sm border border-emerald-200/80 bg-emerald-50 text-emerald-950"
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              <div
                                className={cx(
                                  "mt-1 flex items-center gap-0.5",
                                  outgoing ? "justify-end" : "justify-start"
                                )}
                              >
                                <span className="text-[10px] text-neutral-500">
                                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                                </span>
                                {outgoing ? (
                                  <SentCheckIcon
                                    className="h-3.5 w-3.5 shrink-0 text-neutral-500"
                                    title="Sent"
                                  />
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </div>
              <div className="shrink-0 border-t border-neutral-200/90 bg-white p-3">
                {active && !canUseInAppLicenseMessaging({ status: active.status }) ? (
                  <p className="text-center text-xs text-neutral-600">
                    Messaging is only available while the request is pending or accepted. Open the full license page
                    for details.
                  </p>
                ) : (
                  <>
                    <textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      rows={2}
                      placeholder="Message…"
                      className="w-full resize-none rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm text-neutral-950 outline-none"
                      disabled={sendBusy}
                    />
                    <button
                      type="button"
                      disabled={sendBusy || composer.trim().length < 1}
                      onClick={() => void sendFromDock()}
                      className={cx(solidButtonVariants(), "mt-2 w-full")}
                    >
                      {sendBusy ? "Sending…" : "Send"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        data-license-messages-launcher
        onClick={() => {
          setListError(null);
          setExpanded((e) => !e);
          if (!expanded) {
            setView("list");
            setActive(null);
          }
        }}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-neutral-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)] transition hover:bg-neutral-50"
        aria-expanded={expanded}
        aria-haspopup="dialog"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v9a2.25 2.25 0 0 1-2.25 2.25h-5.379a2.25 2.25 0 0 0-1.59.659l-2.122 2.121c-.532.533-1.441.156-1.441-.59V18.75A2.25 2.25 0 0 1 6 18v-9a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21.75 6.75Z"
          />
        </svg>
        Messages
        {!expanded && unreadCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
