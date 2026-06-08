"use client";

import { useEffect, useState } from "react";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";

type PermissionState = "unknown" | "granted" | "denied" | "prompt";

export function MicrophoneAccessPanel({
  ready,
  pending,
  error,
  onRequestAccess,
}: {
  ready: boolean;
  pending: boolean;
  error: string | null;
  /** Must run getUserMedia inside this click handler (browser prompt). */
  onRequestAccess: () => void;
}) {
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    let status: PermissionStatus | null = null;
    void navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        status = result;
        setPermissionState(result.state as PermissionState);
        result.onchange = () => {
          setPermissionState(result.state as PermissionState);
          if (result.state === "granted") setShowSteps(false);
        };
      })
      .catch(() => setPermissionState("unknown"));

    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  useEffect(() => {
    if (error || permissionState === "denied") setShowSteps(true);
  }, [error, permissionState]);

  if (ready) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Microphone ready.</p>
    );
  }

  const needsHelp = !!error || permissionState === "denied";

  return (
    <div className="space-y-3">
      {!needsHelp ? (
        <p className="text-sm text-neutral-600">
          Click <strong>Allow microphone</strong> — your browser will show its own permission prompt.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onRequestAccess}
          className={solidButtonVariants()}
        >
          {pending ? "Waiting for browser…" : "Allow microphone"}
        </button>
        <button type="button" onClick={() => setShowSteps((v) => !v)} className={outlineButtonVariants()}>
          {showSteps ? "Hide browser steps" : "How to enable in browser"}
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      {showSteps ? <BrowserMicSteps /> : null}
    </div>
  );
}

function BrowserMicSteps() {
  return (
    <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-4 text-sm text-neutral-800">
      <p className="font-medium text-sky-950">Enable microphone in your browser</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          Click the <strong>lock or tune icon</strong> left of the address bar (next to{" "}
          <code className="rounded bg-white/80 px-1 text-xs">localhost</code>).
        </li>
        <li>
          Set <strong>Microphone</strong> to <strong>Allow</strong>.
        </li>
        <li>Reload this page if it still shows Blocked.</li>
        <li>
          Click <strong>Allow microphone</strong> again — the browser&apos;s permission dialog should
          appear.
        </li>
      </ol>
      <p className="mt-3 text-xs text-neutral-600">
        Only your browser can grant this — Muhr cannot change the setting for you. Each person using their
        own computer must allow the mic once for this site.
      </p>
    </div>
  );
}
