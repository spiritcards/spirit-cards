/**
 * Canonical site facts shared by SEO / AI-discoverability routes
 * (robots, sitemap, llms.txt, .well-known, JSON-LD).
 *
 * NEXT_PUBLIC_SITE_URL must be set to the production domain before deploy.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://spiritcards.fun"
).replace(/\/+$/, "");

export const SITE_NAME = "Spirit Cards";

export const SITE_DESCRIPTION =
  "Proof-of-work minted collectible creature cards on Robinhood Chain. Mine a keccak nonce in your browser — the winning hash becomes the card seed; merge, stake, battle and collect. Loop: mine → merge → stake → battle → points.";

/** Marketplace link (OpenSea collection). Env override wins if set. */
export const OPENSEA_URL: string = (
  process.env.NEXT_PUBLIC_OPENSEA_URL?.trim() ||
  "https://opensea.io/collection/spirit-cards"
).replace(/\/+$/, "");

/**
 * Official project links (single source of truth for the sidebar + landing).
 * All links are live: X / GitHub / Telegram / GitBook / OpenSea.
 */
/** Official X / Twitter (@spirit_card). */
export const X_URL: string = (
  process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/spirit_card"
).replace(/\/+$/, "");
/** Official GitHub org (project account `spiritcards`). */
export const GITHUB_URL: string = (
  process.env.NEXT_PUBLIC_GITHUB_URL?.trim() || "https://github.com/spiritcards"
).replace(/\/+$/, "");
/** Official Telegram chat. */
export const TELEGRAM_URL: string = (
  process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim() || "https://t.me/spirit_cards_game"
).replace(/\/+$/, "");
/** Official GitBook — English site. */
export const GITBOOK_EN_URL: string = (
  process.env.NEXT_PUBLIC_GITBOOK_EN_URL?.trim() || "https://spirit-cards.gitbook.io/spirit-cards-docs"
).replace(/\/+$/, "");
/** Official GitBook — 中文 site. */
export const GITBOOK_ZH_URL: string = (
  process.env.NEXT_PUBLIC_GITBOOK_ZH_URL?.trim() || "https://spirit-cards.gitbook.io/spirit-cards-docs-zh"
).replace(/\/+$/, "");

export type SocialIcon = "opensea" | "github" | "x" | "gitbook" | "telegram";
export type SocialLink = { key: string; label: string; href: string; icon: SocialIcon };

export const SOCIAL_LINKS: SocialLink[] = [
  { key: "opensea", label: "OpenSea", href: OPENSEA_URL, icon: "opensea" },
  { key: "github", label: "GitHub", href: GITHUB_URL, icon: "github" },
  { key: "x", label: "X (Twitter)", href: X_URL, icon: "x" },
  { key: "telegram", label: "Telegram", href: TELEGRAM_URL, icon: "telegram" },
  { key: "gitbook-en", label: "GitBook (EN)", href: GITBOOK_EN_URL, icon: "gitbook" },
  { key: "gitbook-zh", label: "文档 (中文)", href: GITBOOK_ZH_URL, icon: "gitbook" },
];
