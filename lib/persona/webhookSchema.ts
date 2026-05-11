import { z } from "zod";

/** Minimal Persona webhook envelope used for KYC status updates. */
export const personaWebhookEnvelopeSchema = z.object({
  data: z
    .object({
      attributes: z
        .object({
          name: z.string().optional(),
          payload: z
            .object({
              data: z
                .object({
                  attributes: z.record(z.unknown()).optional(),
                })
                .optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export type PersonaWebhookEnvelope = z.infer<typeof personaWebhookEnvelopeSchema>;

export function referenceIdFromPersonaWebhook(evt: PersonaWebhookEnvelope): string | undefined {
  const attrs = evt.data?.attributes?.payload?.data?.attributes;
  if (!attrs || typeof attrs !== "object") return undefined;
  const a = attrs as Record<string, unknown>;
  const v = a["reference-id"] ?? a.referenceId;
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
