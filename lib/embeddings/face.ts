export type FaceEmbeddingResult =
  | { ok: true; embedding: number[]; model?: string }
  | { ok: false; error: string };

/**
 * Calls an external service to compute a 512-d face embedding.
 *
 * Configure `MUHR_FACE_EMBEDDING_URL` to point at your inference endpoint.
 * Expected response JSON: `{ embedding: number[], model?: string }`
 *
 * We keep this generic so you can swap providers (Replicate, Fal, in-house).
 */
export async function getFaceEmbeddingFromImageUrl(imageUrl: string): Promise<FaceEmbeddingResult> {
  const endpoint = process.env.MUHR_FACE_EMBEDDING_URL;
  if (!endpoint) {
    return { ok: false, error: "MUHR_FACE_EMBEDDING_URL is not configured" };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Embedding endpoint failed (${res.status}): ${text || res.statusText}` };
    }

    const data: unknown = await res.json();
    const embedding = typeof data === "object" && data !== null && "embedding" in data ? (data as { embedding?: unknown }).embedding : undefined;
    const model = typeof data === "object" && data !== null && "model" in data ? (data as { model?: unknown }).model : undefined;

    if (!Array.isArray(embedding)) {
      return { ok: false, error: "Embedding endpoint returned no embedding array" };
    }
    if (embedding.length !== 512) {
      return { ok: false, error: `Expected 512-d embedding, got ${embedding.length}` };
    }
    for (const v of embedding) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return { ok: false, error: "Embedding contains non-finite numbers" };
      }
    }

    return { ok: true, embedding, model: typeof model === "string" ? model : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown embedding error" };
  } finally {
    clearTimeout(t);
  }
}

