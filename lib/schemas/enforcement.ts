import { z } from "zod";

export const enforcementPlatformSchema = z.enum([
  "instagram",
  "youtube",
  "tiktok",
  "facebook",
  "twitter",
  "ai_model",
  "website",
  "other",
]);

export const enforcementCreateBodySchema = z.object({
  platform: enforcementPlatformSchema,
  url: z.string().url().max(2048),
  description: z.string().max(8000).optional().default(""),
});
