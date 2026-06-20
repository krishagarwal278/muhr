import Link from "next/link";
import { resolveProfileLinks, type ProfileLinkInput } from "@/lib/profile/links";

interface ProfileLinksDisplayProps {
  links: ProfileLinkInput[];
  variant?: "card" | "compact";
}

export function ProfileLinksDisplay({ links, variant = "card" }: ProfileLinksDisplayProps) {
  const resolved = resolveProfileLinks(links);
  if (resolved.length === 0) return null;

  return (
    <div className={variant === "compact" ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
      {resolved.map((link) => (
        <Link
          key={`${link.platform}:${link.value}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            variant === "compact"
              ? "rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50"
              : "rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/15"
          }
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
