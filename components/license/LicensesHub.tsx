"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LicenseRequestRow } from "@/types/license";
import { apiErrorMessage } from "@/lib/api/response";
import { licensesListFromApiJson, type LicenseListCounts } from "@/lib/api/licensesPayload";
import { formatLicenseBudget } from "@/lib/license/brandAvatar";
import { LICENSE_HUB_COPY } from "@/lib/license/hubContent";
import { parseLicenseHubTab, type LicenseHubTab } from "@/lib/license/hubTabs";
import { LicenseHubTabs } from "@/components/license/LicenseHubTabs";
import { LicenseRequestCard } from "@/components/license/LicenseRequestCard";
import { LicenseRequestList } from "@/components/license/LicenseRequestList";
import { RulesAndRatesPanel } from "@/components/license/RulesAndRatesPanel";

function PanelHeader({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
      <div>{left}</div>
      {right ? <div className="text-sm text-neutral-500">{right}</div> : null}
    </div>
  );
}

function InfoBanner({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-[#2D5BFF]/20 bg-[#2D5BFF]/5 px-4 py-3 text-sm text-neutral-700">
      <span className="mr-2 font-semibold text-[#2D5BFF]">ⓘ</span>
      {children}
    </div>
  );
}

export function LicensesHub({ initialTab }: { initialTab?: LicenseHubTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<LicenseHubTab>(
    initialTab ?? parseLicenseHubTab(searchParams.get("tab"))
  );

  const [pending, setPending] = useState<LicenseRequestRow[]>([]);
  const [history, setHistory] = useState<LicenseRequestRow[]>([]);
  const [withdrawn, setWithdrawn] = useState<LicenseRequestRow[]>([]);
  const [counts, setCounts] = useState<LicenseListCounts>({
    pending: 0,
    accepted: 0,
    declined: 0,
    withdrawn: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const activeDeals = useMemo(
    () => history.filter((r) => r.status === "accepted"),
    [history]
  );
  const historyOnly = useMemo(
    () => [...history.filter((r) => r.status !== "accepted"), ...withdrawn],
    [history, withdrawn]
  );

  const openBriefValue = useMemo(
    () => pending.reduce((sum, r) => sum + (r.budget_inr ?? 0), 0),
    [pending]
  );

  const lifetimeEarnings = useMemo(
    () =>
      historyOnly.reduce((sum, r) => {
        if (r.status === "declined" || r.status === "withdrawn") return sum;
        return sum + (r.agreed_budget_inr ?? r.budget_inr ?? 0);
      }, 0),
    [historyOnly]
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/licenses");
    const json = await res.json().catch(() => null);
    if (!res.ok) return;
    const data = licensesListFromApiJson(json);
    if (!data) return;
    setPending(Array.isArray(data.incomingRequests) ? data.incomingRequests : []);
    setHistory(Array.isArray(data.respondedRequests) ? data.respondedRequests : []);
    setWithdrawn(Array.isArray(data.withdrawnRequests) ? data.withdrawnRequests : []);
    if (data.counts) {
      setCounts({
        pending: data.counts.pending ?? 0,
        accepted: data.counts.accepted ?? 0,
        declined: data.counts.declined ?? 0,
        withdrawn: data.counts.withdrawn ?? 0,
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw === "contracts") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "active");
      router.replace(`/licenses?${params.toString()}`, { scroll: false });
      return;
    }
    setActiveTab(parseLicenseHubTab(raw));
  }, [searchParams, router]);

  function selectTab(tab: LicenseHubTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "inbox") params.delete("tab");
    else params.set("tab", tab);
    const qs = params.toString();
    router.replace(qs ? `/licenses?${qs}` : "/licenses", { scroll: false });
  }

  async function respond(id: string, action: "accept" | "decline") {
    setMessage(null);
    const res = await fetch(`/api/licenses/incoming/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        decline_reason: action === "decline" ? declineReason.trim() || null : undefined,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(apiErrorMessage(json, "Update failed"));
      return;
    }
    setDeclineFor(null);
    setDeclineReason("");
    setMessage(action === "accept" ? "Accepted — open workspace to continue." : "Declined.");
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2D5BFF]">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#2D5BFF]" aria-hidden />
          Licensing
        </p>
        <h1 className="muhr-display mt-2 text-3xl text-neutral-950 sm:text-4xl">
          {LICENSE_HUB_COPY.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">{LICENSE_HUB_COPY.subtitle}</p>
      </header>

      <LicenseHubTabs
        active={activeTab}
        onChange={selectTab}
        counts={{
          inbox: counts.pending,
          active: counts.accepted,
          history: counts.declined + counts.withdrawn,
        }}
      />

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-neutral-300/90 bg-neutral-100" />
      ) : null}

      {!loading && activeTab === "inbox" ? (
        <div className="space-y-4">
          <LicenseRequestList
            empty={LICENSE_HUB_COPY.tabs.inbox.empty}
            header={
              pending.length > 0 ? (
                <PanelHeader
                  left={
                    <span className="inline-flex rounded-full bg-[#2D5BFF]/10 px-3 py-1 text-xs font-semibold text-[#2D5BFF]">
                      {pending.length} awaiting review
                    </span>
                  }
                  right="Sorted by expiry"
                />
              ) : undefined
            }
            footer={
              pending.length > 0 && openBriefValue > 0 ? (
                <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4">
                  <span className="text-sm text-neutral-600">Potential value of open briefs</span>
                  <span className="text-sm font-semibold tabular-nums text-neutral-950">
                    {formatLicenseBudget(openBriefValue)}
                  </span>
                </div>
              ) : undefined
            }
          >
            {pending.map((r) => (
              <LicenseRequestCard
                key={r.id}
                request={r}
                variant="default"
                declineOpen={declineFor === r.id}
                declineReason={declineReason}
                onDeclineReasonChange={setDeclineReason}
                onAccept={() => void respond(r.id, "accept")}
                onDeclineStart={() => setDeclineFor(r.id)}
                onDeclineConfirm={() => void respond(r.id, "decline")}
                onDeclineCancel={() => {
                  setDeclineFor(null);
                  setDeclineReason("");
                }}
              />
            ))}
          </LicenseRequestList>
          {LICENSE_HUB_COPY.tabs.inbox.footnote ? (
            <InfoBanner>{LICENSE_HUB_COPY.tabs.inbox.footnote}</InfoBanner>
          ) : null}
        </div>
      ) : null}

      {!loading && activeTab === "active" ? (
        <LicenseRequestList
          empty={LICENSE_HUB_COPY.tabs.active.empty}
          header={
            activeDeals.length > 0 ? (
              <PanelHeader
                left={<span className="text-sm font-semibold text-neutral-950">Active deals</span>}
                right={`${activeDeals.length} in progress`}
              />
            ) : undefined
          }
        >
          {activeDeals.map((r) => (
            <LicenseRequestCard key={r.id} request={r} variant="active" />
          ))}
        </LicenseRequestList>
      ) : null}

      {!loading && activeTab === "history" ? (
        <LicenseRequestList
          empty={LICENSE_HUB_COPY.tabs.history.empty}
          header={
            historyOnly.length > 0 ? (
              <PanelHeader
                left={
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">Completed licenses</p>
                    {lifetimeEarnings > 0 ? (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Lifetime earnings {formatLicenseBudget(lifetimeEarnings)} across {historyOnly.length}{" "}
                        {historyOnly.length === 1 ? "license" : "licenses"}
                      </p>
                    ) : null}
                  </div>
                }
              />
            ) : undefined
          }
        >
          {historyOnly.map((r) => (
            <LicenseRequestCard
              key={r.id}
              request={r}
              variant={r.status === "withdrawn" ? "withdrawn" : "history"}
            />
          ))}
        </LicenseRequestList>
      ) : null}

      {!loading && activeTab === "rules-and-rates" ? <RulesAndRatesPanel /> : null}
    </div>
  );
}
