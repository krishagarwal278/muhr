import { z } from "zod";

export const LegalReviewIssueSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  clause: z.string(),
  problem: z.string(),
  whyItMatters: z.string(),
  suggestedFix: z.string(),
});

export const LegalReviewEditSchema = z.object({
  currentText: z.string().optional(),
  proposedText: z.string(),
  reason: z.string(),
});

export const LegalReviewResultSchema = z.object({
  overallRisk: z.enum(["low", "medium", "high"]),
  summary: z.string(),
  issues: z.array(LegalReviewIssueSchema),
  missingClauses: z.array(z.string()),
  riskyClauses: z.array(z.string()),
  suggestedEdits: z.array(LegalReviewEditSchema),
  disclaimer: z.string(),
});

export type LegalReviewResult = z.infer<typeof LegalReviewResultSchema>;

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

export async function runLegalReview(contractText: string, metadata: Record<string, unknown> | null): Promise<LegalReviewResult> {
  const system = `You are an AI legal contract review assistant for creator likeness licensing contracts.\n\nYou are not a lawyer and must not provide legal advice. Analyze the contract for business/legal risk, missing clauses, ambiguity, creator protection, licensee obligations, AI likeness rights, payment terms, usage scope, approval rights, IP ownership, indemnity, governing law, and enforcement. Return only valid JSON matching the requested schema. Do not include markdown. Do not invent facts. If information is missing, mark it as a risk.`;

  const metadataBlock = metadata ? `Contract metadata:\n${JSON.stringify(metadata)}\n\n` : "";
  const user = `Review the following contract and metadata, then return JSON only matching the schema: overallRisk (low|medium|high), summary, issues[], missingClauses[], riskyClauses[], suggestedEdits[], disclaimer.\n\n${metadataBlock}Contract text:\n\n${contractText}\n\nRespond with JSON only.`;

  const payload = {
    model: "gpt-3.5-turbo",
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

  // parse JSON
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

  // Validate shape
  const validated = LegalReviewResultSchema.parse(parsed);

  // enforce required disclaimer sentence
  const required = "This is an AI-assisted contract review, not legal advice. Consult a qualified lawyer before signing.";
  if (!validated.disclaimer.includes(required)) {
    validated.disclaimer = `${required} ${validated.disclaimer}`.trim();
  }

  return validated;
}
