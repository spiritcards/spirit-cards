import type { ReactElement } from "react";
import { SOCIAL_LINKS, type SocialIcon } from "@/lib/site";
import { IconOpenSea, IconGithub, IconX, IconTelegram, IconDocs } from "./icons";

/**
 * SocialLinks — the project's external links (OpenSea · GitBook · X · GitHub ·
 * Telegram) from the single source `SOCIAL_LINKS` (lib/site.ts).
 *
 * Used in the left sidebar (all app pages) + mobile "More" sheet, and duplicated
 * on the landing (which has no sidebar). Entries whose href is still "#" render
 * as a dimmed "coming soon" chip instead of a dead link.
 */
const ICONS: Record<SocialIcon, (p: { className?: string; size?: number }) => ReactElement> = {
  opensea: IconOpenSea,
  github: IconGithub,
  x: IconX,
  telegram: IconTelegram,
  gitbook: IconDocs,
};

const CHIP =
  "inline-flex items-center gap-2 border border-slate/70 bg-obsidian/40 px-2.5 py-2 font-code text-[10px] uppercase tracking-[0.12em] text-ash transition-colors";

export function SocialLinks({
  labels = false,
  className = "",
}: {
  labels?: boolean;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`}>
      {SOCIAL_LINKS.map((l) => {
        const Icon = ICONS[l.icon];
        const disabled = !l.href || l.href === "#";
        const content = (
          <>
            <Icon size={16} />
            {labels ? <span>{l.label}</span> : null}
          </>
        );
        return (
          <li key={l.key}>
            {disabled ? (
              <span
                className={`${CHIP} cursor-default opacity-45`}
                title={`${l.label} — link coming soon`}
                aria-disabled="true"
              >
                {content}
              </span>
            ) : (
              <a
                className={`${CHIP} hover:border-ember hover:text-bone`}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                title={l.label}
                aria-label={labels ? undefined : `${l.label} (opens in a new tab)`}
              >
                {content}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
