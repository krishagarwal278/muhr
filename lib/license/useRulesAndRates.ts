"use client";

import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api/response";
import {
  DEFAULT_RULES_AND_RATES,
  rulesAndRatesFromApiJson,
  type RulesAndRatesPayload,
} from "@/lib/consent/rulesAndRates";

export function useRulesAndRates() {
  const [rules, setRules] = useState<RulesAndRatesPayload>(DEFAULT_RULES_AND_RATES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      setLoadError(null);
      try {
        const res = await fetch("/api/consent");
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const message = apiErrorMessage(json, "Failed to load rules and rates");
          if (!cancelled) setLoadError(message);
          return;
        }
        const loaded = rulesAndRatesFromApiJson(json);
        if (!cancelled) {
          if (loaded) setRules(loaded);
          else setLoadError("Unexpected response from server. Please refresh.");
        }
      } catch {
        if (!cancelled) setLoadError("Network error. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRules();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRules = useCallback(
    <K extends keyof RulesAndRatesPayload>(key: K, value: RulesAndRatesPayload[K]) => {
      setRules((prev) => ({ ...prev, [key]: value }));
      setSaveSuccess(false);
      setSaveError(null);
    },
    []
  );

  const save = useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        setSaveError(apiErrorMessage(json, "Failed to save rules and rates"));
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [rules]);

  return {
    rules,
    loading,
    loadError,
    saving,
    saveSuccess,
    saveError,
    updateRules,
    save,
  };
}
