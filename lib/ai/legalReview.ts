import crypto from "crypto";
import { z } from "zod";
import { redactPII } from "./redact";

export const ReviewIssueSchema = z.object({
  id: z.string(),
  clause: z.string().optional(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  suggestion: z.string().optional(),
  snippet: z.string().optional(),
});

export const ReviewResponseSchema = z.object({
  overallRisk: z.enum(["low", "medium", "high"]),
  summary: z.string(),
  issues: z.array(ReviewIssueSchema),
  missingClauses: z.array(z.string()).optional(),
  riskyClauses: z.array(z.string()).optional(),
  suggestedEdits: z.array(z.object({ currentText: z.string().optional(), proposedText: z.string(), reason: z.string().optional() })).optional(),
  disclaimer: z.string(),
});

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

const DEFAULT_DISCLAIMER =
  "This is an AI-assisted contract review, not legal advice. Consult a qualified lawyer before signing.";

function coerceSeverity(value: unknown): "info" | "warning" | "critical" {
  const v = String(value ?? "info").toLowerCase();
  if (v === "critical" || v === "high") return "critical";
  if (v === "warning" || v === "medium") return "warning";
  return "info";
}

function coerceOverallRisk(value: unknown): "low" | "medium" | "high" {
  const v = String(value ?? "medium").toLowerCase();
  if (v === "high" || v === "critical") return "high";
  if (v === "low") return "low";
  return "medium";
}

/** Coerce common LLM JSON variants into the shape our zod schema expects. */
export function normalizeReviewPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const issuesRaw = Array.isArray(o.issues) ? o.issues : [];
  const issues = issuesRaw.map((item, index) => {
    const it =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    return {
      id: String(it.id ?? `issue-${index + 1}`),
      clause: typeof it.clause === "string" ? it.clause : undefined,
      severity: coerceSeverity(it.severity),
      message: String(it.message ?? it.problem ?? it.summary ?? "Review finding"),
      suggestion:
        typeof it.suggestion === "string"
          ? it.suggestion
          : typeof it.suggestedFix === "string"
            ? it.suggestedFix
            : undefined,
      snippet: typeof it.snippet === "string" ? it.snippet : undefined,
    };
  });

  return {
    overallRisk: coerceOverallRisk(o.overallRisk ?? o.overall_risk),
    summary: String(o.summary ?? "Review complete."),
    issues,
    missingClauses: Array.isArray(o.missingClauses) ? o.missingClauses.map(String) : [],
    riskyClauses: Array.isArray(o.riskyClauses) ? o.riskyClauses.map(String) : [],
    suggestedEdits: Array.isArray(o.suggestedEdits) ? o.suggestedEdits : [],
    disclaimer: String(o.disclaimer ?? "").trim() || DEFAULT_DISCLAIMER,
  };
}

async function callOpenAI(payload: unknown) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const body = typeof payload === "string" ? payload : JSON.stringify(payload as Record<string, unknown>);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${res.statusText} \n${txt}`);
  }
  return res.json();
}

export function tiptapToPlainText(doc: unknown): string {
  function walk(node: unknown): string {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(walk).join("");
    if (typeof node === "object" && node !== null) {
      const n = node as Record<string, unknown>;
      const type = typeof n.type === "string" ? n.type : undefined;
      if (typeof n.text === "string") return n.text;
      if (type === "paragraph" || type === "heading") {
        const inner = Array.isArray(n.content) ? n.content.map(walk).join("") : "";
        return inner + "\n\n";
      }
      if (type === "bulletList" || type === "orderedList") {
        const arr = Array.isArray(n.content) ? n.content : [];
        return arr.map((item) => walk(item)).join("\n") + "\n";
      }
      if (type === "listItem") {
        const arr = Array.isArray(n.content) ? n.content : [];
        return "- " + arr.map(walk).join("") + "\n";
      }
      const arr = Array.isArray(n.content) ? n.content : [];
      return arr.map(walk).join("");
    }
    return "";
  }

  if (typeof doc !== "object" || doc === null) return "";
  const d = doc as { content?: unknown[] };
  if (Array.isArray(d.content)) return d.content.map(walk).join("");
  return JSON.stringify(doc);
}

export function computeFingerprint(plainText: string, metadata: Record<string, unknown> | null = null) {
  const hash = crypto.createHash("sha256");
  hash.update(plainText);
  if (metadata) hash.update(JSON.stringify(metadata));
  return hash.digest("hex");
}

export async function runLegalReview(
  plainText: string,
  metadata: Record<string, unknown> | null = null
): Promise<ReviewResponse> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const redact = process.env.AI_REDACT === "true";
  const textToSend = redact ? redactPII(plainText) : plainText;

  const system = `You are a helpful contract reviewer assistant. Given a plain-text license contract, identify potential issues categorized by clause (Approvals, Deliverables, IP, Warranties, Indemnity, Payment, Duration, Budget, Usage, Other). Return JSON only, matching this shape: {\n  \"overallRisk\": \"low|medium|high\",\n  \"summary\": \"short TL;DR\",\n  \"issues\": [ { \"id\": \"uuid-or-short\", \"clause\": \"Approvals\", \"severity\": \"info|warning|critical\", \"message\": \"explain risk in plain language\", \"suggestion\": \"suggested replacement text (optional)\", \"snippet\": \"contract excerpt (optional)\" } ],\n  \"missingClauses\": [\"string\"],\n  \"riskyClauses\": [\"string\"],\n  \"suggestedEdits\": [ { \"currentText\": \"optional\", \"proposedText\": \"required\", \"reason\": \"optional\" } ],\n  \"disclaimer\": \"required disclaimer string\"\n}\nDo not include any other text.`;

  const metadataBlock = metadata ? `Contract metadata:\n${JSON.stringify(metadata)}\n\n` : "";
  const user = `${metadataBlock}Contract:\n\n${textToSend}\n\nRespond with JSON only.`;

  const payload = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0,
    max_tokens: 1200,
  };

  const json = await callOpenAI(payload);
  const assistant = String(json?.choices?.[0]?.message?.content ?? "");
  if (!assistant) throw new Error("No assistant content returned");

  let parsed: unknown;
  try {
    parsed = JSON.parse(assistant);
  } catch {
    const m = assistant.match(/\{[\s\S]*\}$/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        throw new Error("Failed to parse JSON from model response");
      }
    } else {
      throw new Error("Failed to parse JSON from model response");
    }
  }

  return ReviewResponseSchema.parse(normalizeReviewPayload(parsed));
}

export function mapLegalReviewError(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof z.ZodError) {
    return {
      status: 422,
      code: "invalid_review",
      message: "Could not read the AI review. Try again.",
    };
  }
  if (err instanceof Error) {
    if (err.message.includes("OPENAI_API_KEY")) {
      return {
        status: 503,
        code: "ai_not_configured",
        message: "AI review is not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.",
      };
    }
    if (err.message.startsWith("OpenAI error:")) {
      return {
        status: 502,
        code: "ai_upstream",
        message: "AI service error. Try again in a moment.",
      };
    }
    if (err.message.includes("Failed to parse JSON") || err.message.includes("No assistant content")) {
      return {
        status: 502,
        code: "invalid_review",
        message: "Could not parse the AI response. Try again.",
      };
    }
  }
  return {
    status: 500,
    code: "internal_error",
    message: "Something went wrong",
  };
}
