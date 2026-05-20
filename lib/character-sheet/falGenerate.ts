import "server-only";

import type { CharacterSheetStats } from "./types";
import { buildCharacterSheetPrompt } from "./prompt";

const FAL_QUEUE = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";

interface FalImageOutput {
  images?: { url: string }[];
}

/**
 * Optional AI turnaround via fal.ai (set FAL_KEY).
 * Uses image-to-image from the user's best front-facing character photo.
 */
export async function tryFalCharacterSheet(args: {
  referenceImageUrl: string;
  stats: CharacterSheetStats;
}): Promise<string | null> {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) return null;

  const prompt = buildCharacterSheetPrompt(args.stats);

  const submitRes = await fetch(FAL_QUEUE, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: args.referenceImageUrl,
      strength: 0.65,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      image_size: "landscape_16_9",
    }),
  });

  if (!submitRes.ok) {
    console.error("fal submit:", submitRes.status, await submitRes.text());
    return null;
  }

  const submitJson = (await submitRes.json()) as { request_id?: string; response_url?: string };
  const statusUrl =
    submitJson.response_url ??
    (submitJson.request_id
      ? `https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${submitJson.request_id}`
      : null);

  if (!statusUrl) return null;

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    if (!poll.ok) continue;
    const body = (await poll.json()) as { status?: string } & FalImageOutput;
    if (body.status === "FAILED") return null;
    if (body.images?.[0]?.url) return body.images[0].url;
    if (body.status === "COMPLETED" && body.images?.[0]?.url) return body.images[0].url;
  }

  return null;
}
