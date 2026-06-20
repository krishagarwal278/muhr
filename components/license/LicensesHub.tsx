"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LicenseRequestRow } from "@/types/license";
import { apiErrorMessage } from "@/lib/api/response";
import { licensesListFromApiJson, type LicenseListCounts } from "@/lib/api/licensesPayload";
import { LICENSE_HUB_COPY } from "@/lib/license/hubContent";
import { parseLicenseHubTab, type LicenseHubTab } from "@/lib/license/hubTabs";
import { LicenseHubTabs } from "@/components/license/LicenseHubTabs";
import { LicenseRequestCard } from "@/components/license/LicenseRequestCard";
import { LicenseRequestList } from "@/components/license/LicenseRequestList";
import { RulesAndRatesPanel } from "@/components/license/RulesAndRatesPanel";
import { appPageTitleVariants } from "@/components/ui/page-header";

function TabHint({ children }: { children: string }) {
  return <p className="text-sm text-neutral-600">{children}</p>;
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
      <div>
        <h1 className={appPageTitleVariants()}>{LICENSE_HUB_COPY.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{LICENSE_HUB_COPY.subtitle}</p>
      </div>

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
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl border border-black/10 bg-neutral-100" />
      ) : null}

      {!loading && activeTab === "inbox" ? (
        <div className="space-y-4">
          <LicenseRequestList empty={LICENSE_HUB_COPY.tabs.inbox.empty}>
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
          {pending.length > 0 && LICENSE_HUB_COPY.tabs.inbox.footnote ? (
            <p className="text-xs text-neutral-600">{LICENSE_HUB_COPY.tabs.inbox.footnote}</p>
          ) : null}
        </div>
      ) : null}

      {!loading && activeTab === "active" ? (
        <div className="space-y-4">
          {LICENSE_HUB_COPY.tabs.active.hint ? (
            <TabHint>{LICENSE_HUB_COPY.tabs.active.hint}</TabHint>
          ) : null}
          <LicenseRequestList empty={LICENSE_HUB_COPY.tabs.active.empty}>
            {activeDeals.map((r) => (
              <LicenseRequestCard key={r.id} request={r} variant="active" />
            ))}
          </LicenseRequestList>
        </div>
      ) : null}

      {!loading && activeTab === "history" ? (
        <div className="space-y-4">
          {LICENSE_HUB_COPY.tabs.history.hint ? (
            <TabHint>{LICENSE_HUB_COPY.tabs.history.hint}</TabHint>
          ) : null}
          <LicenseRequestList empty={LICENSE_HUB_COPY.tabs.history.empty}>
            {historyOnly.map((r) => (
              <LicenseRequestCard
                key={r.id}
                request={r}
                variant={r.status === "withdrawn" ? "withdrawn" : "history"}
              />
            ))}
          </LicenseRequestList>
        </div>
      ) : null}

      {!loading && activeTab === "rules-and-rates" ? <RulesAndRatesPanel /> : null}
    </div>
  );
}
