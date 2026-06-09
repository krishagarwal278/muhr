"use client";

import { useState } from "react";
import { WaitlistDetailsModal } from "@/components/waitlist/WaitlistDetailsModal";
import { parseWaitlistResponse } from "@/lib/waitlist/parseWaitlistResponse";
import type { WaitlistResponse } from "@/types";

type FormState = "idle" | "loading" | "success" | "error";

type LandingWaitlistFormProps = {
  userType?: "creator" | "business";
};

export function LandingWaitlistForm({ userType = "creator" }: LandingWaitlistFormProps) {
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
      const json = await res.json();
      const data: WaitlistResponse = parseWaitlistResponse(json, res.ok);
      if (data.success) {
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
      const json = await res.json();
      const data: WaitlistResponse = parseWaitlistResponse(json, res.ok);
      if (data.success) {
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
      <p role="status" className="waitlist-status">
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
      <form onSubmit={handleSubmit} className="waitlist-form">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="your@email.com"
          className={`waitlist-input${state === "error" ? " error" : ""}`}
        />
        <button type="submit" disabled={state === "loading"} className="btn btn-primary">
          {state === "loading"
            ? "Processing…"
            : userType === "business"
              ? "Request brand access"
              : "Join the waitlist"}
        </button>
      </form>
      {state === "error" ? (
        <p role="alert" className="waitlist-error">
          {message}
        </p>
      ) : null}
    </>
  );
}
