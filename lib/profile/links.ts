import { z } from "zod";

export const PROFILE_LINK_PLATFORMS = [
  { id: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { id: "youtube", label: "YouTube", placeholder: "@yourchannel or youtube.com/@yourchannel" },
  { id: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { id: "x", label: "X", placeholder: "@yourhandle" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/yourname" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/yourpage" },
  { id: "imdb", label: "IMDb", placeholder: "nm1234567 or imdb.com/name/nm1234567/" },
  { id: "website", label: "Website", placeholder: "https://yourwebsite.com" },
] as const;

const PLATFORM_IDS = PROFILE_LINK_PLATFORMS.map((item) => item.id);

const MAX_LINKS = 8;

export type ProfileLinkPlatform = (typeof PROFILE_LINK_PLATFORMS)[number]["id"];

export function isProfileLinkPlatform(value: string): value is ProfileLinkPlatform {
  return (PLATFORM_IDS as readonly string[]).includes(value);
}

export type ProfileLinkInput = {
  platform: ProfileLinkPlatform;
  value: string;
};

export type ProfileLink = ProfileLinkInput & {
  href: string;
  label: string;
};

const linkSchema = z.object({
  platform: z.enum(PLATFORM_IDS as [ProfileLinkPlatform, ...ProfileLinkPlatform[]]),
  value: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine((v) => !/[\0\x00-\x08\x0e-\x1f]/.test(v), "Invalid characters"),
});

function isAllowedOutboundHref(href: string): boolean {
  const url = parseUrlMaybe(href);
  if (!url || url.protocol !== "https:" || !url.hostname) return false;
  if (url.username || url.password) return false;
  const host = cleanHost(url.hostname);
  if (!host.includes(".")) return false;
  return true;
}

function finalizeProfileLink(link: ProfileLink): ProfileLink | null {
  if (!isAllowedOutboundHref(link.href)) return null;
  return link;
}

export function profileLinkStoredValue(parsed: ProfileLink): string {
  return parsed.platform === "instagram" || parsed.platform === "imdb" ? parsed.value : parsed.href;
}

function buildProfileLink(
  platform: ProfileLinkPlatform,
  value: string,
  href: string,
  label: string
): ProfileLink | null {
  return finalizeProfileLink({ platform, value, href, label });
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
}

function parseUrlMaybe(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function cleanHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function hostMatches(hostname: string, baseHost: string): boolean {
  const host = cleanHost(hostname);
  if (host === baseHost) return true;
  // Allow single labels like www/m, not attacker-linkedin.com or youtube.com.evil.com
  const escaped = baseHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^[a-z0-9-]+\\.${escaped}$`, "i").test(host);
}

/** Parse user input as https URL when no scheme; never use substring host checks. */
function parseUrlFromUserInput(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return parseUrlMaybe(trimmed);
  }
  return parseUrlMaybe(`https://${trimmed.replace(/^\/+/, "")}`);
}

function parseSocialHandle(raw: string, host: string, platformPathPrefix = ""): string | null {
  const asUrl = parseUrlMaybe(raw.trim());
  if (asUrl) {
    if (!hostMatches(asUrl.hostname, host)) return null;
    const path = asUrl.pathname.replace(/^\/+/, "");
    if (!path) return null;
    return normalizeHandle(platformPathPrefix ? path.replace(`${platformPathPrefix}/`, "") : path.split("/")[0] ?? "");
  }
  const handle = normalizeHandle(raw);
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(handle)) return null;
  return handle;
}

export function parseProfileLink(platform: ProfileLinkPlatform, raw: string): ProfileLink | null {
  const value = raw.trim();
  if (!value) return null;

  if (platform === "website") {
    const url = parseUrlFromUserInput(value);
    if (!url || url.protocol !== "https:" || !url.hostname) return null;
    const normalized = `${url.origin}${url.pathname}${url.search}${url.hash}`;
    return buildProfileLink(
      platform,
      normalized,
      normalized,
      PROFILE_LINK_PLATFORMS.find((p) => p.id === platform)?.label ?? "Website"
    );
  }

  if (platform === "imdb") {
    const directId = value.match(/^nm\d{4,}$/i)?.[0]?.toLowerCase();
    if (directId) {
      const href = `https://www.imdb.com/name/${directId}/`;
      return buildProfileLink(platform, directId, href, "IMDb");
    }
    const directUserId = value.match(/^ur\d{4,}$/i)?.[0]?.toLowerCase();
    if (directUserId) {
      const href = `https://www.imdb.com/user/${directUserId}/`;
      return buildProfileLink(platform, directUserId, href, "IMDb");
    }
    const directProfileId = value.match(/^p\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
    if (directProfileId) {
      const href = `https://www.imdb.com/user/${directProfileId}/`;
      return buildProfileLink(platform, directProfileId, href, "IMDb");
    }
    const asUrl = parseUrlFromUserInput(value);
    if (!asUrl || !hostMatches(asUrl.hostname, "imdb.com")) return null;
    const match = asUrl.pathname.match(/\/name\/(nm\d{4,})/i);
    if (match) {
      const id = match[1].toLowerCase();
      return buildProfileLink(platform, id, `https://www.imdb.com/name/${id}/`, "IMDb");
    }
    const userMatch = asUrl.pathname.match(/\/user\/(ur\d{4,})/i);
    if (userMatch) {
      const userId = userMatch[1].toLowerCase();
      return buildProfileLink(platform, userId, `https://www.imdb.com/user/${userId}/`, "IMDb");
    }
    const profileMatch = asUrl.pathname.match(/\/user\/(p\.[a-z0-9]+)/i);
    if (profileMatch) {
      const profileId = profileMatch[1].toLowerCase();
      return buildProfileLink(platform, profileId, `https://www.imdb.com/user/${profileId}/`, "IMDb");
    }
    return null;
  }

  if (platform === "youtube") {
    // Back-compat: older saves used "channel/UC…" instead of a full URL.
    const legacyChannel = value.match(/^channel\/(UC[\w-]+)$/i);
    if (legacyChannel) {
      const href = `https://www.youtube.com/channel/${legacyChannel[1]}`;
      return buildProfileLink(platform, href, href, "YouTube");
    }

    const asUrl = parseUrlFromUserInput(value);

    if (asUrl && hostMatches(asUrl.hostname, "youtube.com")) {
      const path = asUrl.pathname.replace(/\/+$/, "") || "/";

      // e.g. https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ
      const channelId = path.match(/^\/channel\/(UC[\w-]+)/i)?.[1];
      if (channelId) {
        const href = `https://www.youtube.com/channel/${channelId}`;
        return buildProfileLink(platform, href, href, "YouTube");
      }

      if (path.startsWith("/@")) {
        const handle = normalizeHandle(path.slice(2).split("/")[0] ?? "");
        if (!handle) return null;
        const href = `https://www.youtube.com/@${handle}`;
        return buildProfileLink(platform, href, href, "YouTube");
      }

      const legacy = path.match(/^\/(user|c)\/([\w.-]+)/);
      if (legacy) {
        const href = `https://www.youtube.com/${legacy[1]}/${legacy[2]}`;
        return buildProfileLink(platform, href, href, "YouTube");
      }
    }

    const handle = normalizeHandle(value);
    if (/^[\w.-]{1,100}$/.test(handle)) {
      const href = `https://www.youtube.com/@${handle}`;
      return buildProfileLink(platform, href, href, "YouTube");
    }

    return null;
  }

  if (platform === "linkedin") {
    const asUrl =
      parseUrlFromUserInput(value) ??
      parseUrlMaybe(
        value.startsWith("in/") || value.startsWith("company/")
          ? `https://www.linkedin.com/${value.replace(/^\/+/, "")}`
          : `https://www.linkedin.com/in/${value.replace(/^\/+/, "")}`
      );
    if (!asUrl || !hostMatches(asUrl.hostname, "linkedin.com")) return null;
    const match = asUrl.pathname.match(/^\/(in|company)\/([A-Za-z0-9._%:-]+)(?:\/|$)/);
    if (!match) return null;
    const kind = match[1];
    const slug = match[2];
    const href = `https://www.linkedin.com/${kind}/${slug}`;
    return buildProfileLink(platform, href, href, "LinkedIn");
  }

  if (platform === "instagram") {
    const handle = parseSocialHandle(value, "instagram.com");
    if (!handle) return null;
    return buildProfileLink(platform, handle, `https://instagram.com/${handle}`, "Instagram");
  }

  if (platform === "tiktok") {
    const asUrl = parseUrlFromUserInput(value);
    if (asUrl) {
      if (!hostMatches(asUrl.hostname, "tiktok.com")) return null;
      const match = asUrl.pathname.match(/^\/@([A-Za-z0-9._-]{1,100})/);
      if (!match) return null;
      const handle = match[1];
      return buildProfileLink(platform, handle, `https://www.tiktok.com/@${handle}`, "TikTok");
    }
    const handle = normalizeHandle(value);
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(handle)) return null;
    return buildProfileLink(platform, handle, `https://www.tiktok.com/@${handle}`, "TikTok");
  }

  if (platform === "x") {
    const handle = parseSocialHandle(value, "x.com");
    if (!handle) return null;
    return buildProfileLink(platform, handle, `https://x.com/${handle}`, "X");
  }

  if (platform === "facebook") {
    const handle = parseSocialHandle(value, "facebook.com");
    if (!handle) return null;
    return buildProfileLink(platform, handle, `https://www.facebook.com/${handle}`, "Facebook");
  }

  return null;
}

/** Client-side check before save — catches empty rows and invalid URLs with a clear message. */
export function validateProfileLinksBeforeSave(
  links: ProfileLinkInput[]
): { ok: true; data: ProfileLinkInput[] } | { ok: false; error: string } {
  if (links.length === 0) {
    return { ok: true, data: [] };
  }

  for (const item of links) {
    if (!item.value.trim()) {
      const label = PROFILE_LINK_PLATFORMS.find((p) => p.id === item.platform)?.label ?? "link";
      return {
        ok: false,
        error: `Add a URL or handle for ${label}, or remove that row before saving.`,
      };
    }
  }

  return sanitizeProfileLinks(links);
}

export function sanitizeProfileLinks(input: unknown): { ok: true; data: ProfileLinkInput[] } | { ok: false; error: string } {
  const raw =
    Array.isArray(input)
      ? input.filter((item) => typeof (item as { value?: unknown } | null)?.value === "string" && String((item as { value?: string }).value).trim().length > 0)
      : input;

  const parsed = z.array(linkSchema).max(MAX_LINKS, `You can add up to ${MAX_LINKS} profile links.`).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid profileLinks payload." };
  }

  const deduped = new Set<ProfileLinkPlatform>();
  const links: ProfileLinkInput[] = [];
  for (const item of parsed.data) {
    if (deduped.has(item.platform)) {
      return { ok: false, error: "Each platform can only be added once." };
    }
    const parsedLink = parseProfileLink(item.platform, item.value);
    if (!parsedLink) {
      const label = PROFILE_LINK_PLATFORMS.find((p) => p.id === item.platform)?.label ?? "link";
      return { ok: false, error: `Invalid ${label} link.` };
    }
    deduped.add(item.platform);
    links.push({ platform: item.platform, value: profileLinkStoredValue(parsedLink) });
  }

  return { ok: true, data: links };
}

export function resolveProfileLinks(input: ProfileLinkInput[] | null | undefined): ProfileLink[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => parseProfileLink(item.platform, item.value))
    .filter((item): item is ProfileLink => !!item);
}

/** Read links from DB without dropping the whole list when one row is stale. */
export function coerceProfileLinksFromStorage(stored: unknown): ProfileLinkInput[] {
  if (!Array.isArray(stored)) return [];

  const links: ProfileLinkInput[] = [];
  for (const item of stored) {
    if (!item || typeof item !== "object") continue;
    const platform = (item as { platform?: unknown }).platform;
    const value = (item as { value?: unknown }).value;
    if (typeof platform !== "string" || typeof value !== "string") continue;
    const normalizedPlatform = platform.trim().toLowerCase();
    if (!isProfileLinkPlatform(normalizedPlatform)) continue;
    const parsed = parseProfileLink(normalizedPlatform, value);
    if (!parsed) continue;
    links.push({ platform: normalizedPlatform, value: profileLinkStoredValue(parsed) });
  }
  return links;
}

export function profileLinksFromLegacyRow(row: { social_platform?: string | null; social_username?: string | null }): ProfileLinkInput[] {
  const platform = row.social_platform?.trim().toLowerCase();
  const username = row.social_username?.trim();
  if (platform !== "instagram" || !username) return [];
  const parsed = parseProfileLink("instagram", username);
  if (!parsed) return [];
  return [{ platform: "instagram", value: parsed.value }];
}
