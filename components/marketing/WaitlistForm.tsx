"use client";

import { useState } from "react";
import { WaitlistDetailsModal } from "@/components/waitlist/WaitlistDetailsModal";
import type { UserType, WaitlistResponse } from "@/types";

type FormState = "idle" | "loading" | "success" | "error";

export interface WaitlistFormProps {
  userType: UserType;
  label: string;
  variant: "primary" | "secondary";
}

export function WaitlistForm({ userType, label, variant }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setDetailsError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_type: userType }),
      });
      const data: WaitlistResponse = await res.json();
      if (res.ok && data.success) {
        if (data.needsDetails) {
          setPendingEmail(email.trim().toLowerCase());
          setDetailsOpen(true);
          setState("idle");
        } else {
          setState("success");
          setMessage(data.message);
          setEmail("");
        }
      } else {
        setState("error");
        setMessage(
          data.message ||
            (res.status === 429 ? "Too many submissions. Try again later." : "Something went wrong.")
        );
      }
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  async function submitDetails(instagram: string, profession: string) {
    if (!pendingEmail) return;
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await fetch("/api/waitlist/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          instagram_profile: instagram,
          profession,
        }),
      });
      const data: WaitlistResponse = await res.json();
      if (res.ok && data.success) {
        setDetailsOpen(false);
        setState("success");
        setMessage(data.message);
        setEmail("");
        setPendingEmail(null);
      } else {
        setDetailsError(data.message || "Something went wrong.");
      }
    } catch {
      setDetailsError("Something went wrong. Please try again.");
    } finally {
      setDetailsLoading(false);
    }
  }

  if (state === "success") {
    return (
      <p
        role="status"
        className="mt-2 rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-xs text-neutral-900/70 backdrop-blur-sm sm:px-5 sm:py-3 sm:text-sm"
      >
        {message}
      </p>
    );
  }

  return (
    <>
      <WaitlistDetailsModal
        open={detailsOpen}
        email={pendingEmail ?? email}
        loading={detailsLoading}
        error={detailsError}
        onClose={() => {
          setDetailsOpen(false);
          setState("success");
          setMessage("You're on the list. We'll be in touch.");
          setEmail("");
          setPendingEmail(null);
        }}
        onSubmit={(instagram, profession) => void submitDetails(instagram, profession)}
      />
      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 min-[480px]:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="your@email.com"
          className={`w-full flex-1 rounded-full border px-4 py-2.5 text-xs text-neutral-950 placeholder:text-neutral-500/70 outline-none transition focus:border-black/20 sm:px-5 sm:py-3.5 sm:text-sm ${
            state === "error"
              ? "border-red-500/50 bg-red-500/5"
              : "border-black/10 bg-white/80 backdrop-blur-sm"
          }`}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className={`w-full shrink-0 rounded-full px-5 py-2.5 text-xs font-medium transition disabled:opacity-60 sm:px-6 sm:py-3.5 sm:text-sm min-[480px]:w-auto ${
            variant === "primary"
              ? "bg-neutral-950 text-white hover:opacity-90"
              : "border border-black/10 bg-white/70 text-neutral-900 hover:bg-white"
          }`}
        >
          {state === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent sm:h-3.5 sm:w-3.5"
              />
              Processing…
            </span>
          ) : (
            label
          )}
        </button>
        {state === "error" ? (
          <p role="alert" className="w-full pl-2 text-[11px] text-red-400 sm:text-xs">
            {message}
          </p>
        ) : null}
      </form>
    </>
  );
}
