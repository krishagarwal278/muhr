import { z } from "zod";

export const ReviewIssueSchema = z.object({
  id: z.string(),
  clause: z.string().optional(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  suggestion: z.string().optional(),
  snippet: z.string().optional(),
});

export const ReviewResponseSchema = z.object({
  summary: z.string(),
  issues: z.array(ReviewIssueSchema),
});

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

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
  // Very small TipTap/ProseMirror JSON -> plain text extractor
  function walk(node: unknown): string {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(walk).join("");
    if (typeof node === "object" && node !== null) {
      const n = node as Record<string, unknown>;
      const type = typeof n.type === "string" ? (n.type as string) : undefined;
      if (typeof (n.text as unknown) === "string") return n.text as string;
      if (type === "paragraph" || type === "heading") {
        const inner = Array.isArray(n.content) ? (n.content as unknown[]).map(walk).join("") : "";
        return inner + "\n\n";
      }
      if (type === "bulletList" || type === "orderedList") {
        const arr = Array.isArray(n.content) ? (n.content as unknown[]) : [];
        return arr.map((item) => walk(item)).join("\n") + "\n";
      }
      if (type === "listItem") {
        const arr = Array.isArray(n.content) ? (n.content as unknown[]) : [];
        return "- " + arr.map(walk).join("") + "\n";
      }
      // default: recurse
      const arr = Array.isArray(n.content) ? (n.content as unknown[]) : [];
      return arr.map(walk).join("");
    }
    return "";
  }

  if (typeof doc !== "object" || doc === null) return "";
  // If doc has content array
  const d = doc as { content?: unknown[] };
  if (Array.isArray(d.content)) return d.content.map(walk).join("");
  return JSON.stringify(doc);
}

export async function runLegalReview(plainText: string) {
  // Build a concise prompt asking for JSON output following our schema
  const system = `You are a helpful contract reviewer assistant. Given a plain-text license contract, identify potential issues categorized by clause (Approvals, Deliverables, IP, Warranties, Indemnity, Payment, Duration, Budget, Usage, Other). Return JSON only, matching this shape: {"summary":"short TL;DR", "issues":[{"id":"uuid-or-short","clause":"Approvals","severity":"info|warning|critical","message":"explain risk in plain language","suggestion":"suggested replacement text (optional)","snippet":"contract excerpt (optional)"}]} Do not include any other text.`;

  const user = `Contract:\n\n${plainText}\n\nRespond with JSON only.`;

  const payload = {
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0,
    max_tokens: 800,
  };

  const json = await callOpenAI(payload);
  const assistant = String(json?.choices?.[0]?.message?.content ?? "");
  if (!assistant) throw new Error("No assistant content returned");

  // Attempt to parse JSON from assistant
  let parsed: unknown;
  try {
    parsed = JSON.parse(assistant);
  } catch {
    // Try to extract JSON substring
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

  const result = ReviewResponseSchema.parse(parsed);
  return result as ReviewResponse;
}
