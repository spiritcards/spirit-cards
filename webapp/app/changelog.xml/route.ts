import { SITE_URL } from "@/lib/site";

/**
 * /changelog.xml — RSS 2.0 feed of shipped milestones.
 * Static curated list (not derived from git).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

const FEED_URL = `${SITE_URL}/changelog.xml`;

type Milestone = { title: string; link: string; guid: string; date: string; description: string };

const MILESTONES: Milestone[] = [
  {
    title: "Spirit Cards on-chain rebrand + marketplace metadata (stack t8)",
    link: `${SITE_URL}/collection`,
    guid: "poc:t8-marketplace-metadata",
    date: "2026-10-04T11:05:00Z",
    description:
      "SpiritCards redeployed as stack t8 with the on-chain name Spirit Cards / SPC and marketplace metadata for OpenSea: contractURI() (EIP-7572, contract-embedded JSON), owner() (ERC-173) and setBaseURI (ERC-4906).",
  },
  {
    title: "MCP agent tooling — project-info, mining-guide, find_nonce",
    link: `${SITE_URL}/docs/agent-access`,
    guid: "poc:mcp-agents",
    date: "2026-09-30T00:47:33Z",
    description:
      "Agent-facing tooling expanded: project-info, mining-guide and find_nonce tools plus agent prompts, and a standalone MCP repo for third-party agents.",
  },
  {
    title: "Read-only MCP server at /api/mcp",
    link: `${SITE_URL}/docs/agent-access`,
    guid: "poc:mcp-server",
    date: "2026-09-29T22:53:37Z",
    description:
      "A read-only Model Context Protocol server exposed at /api/mcp with 9 tools, surfaced across the agent documentation.",
  },
  {
    title: "GitBook (EN + 中文), GitHub scaffolding and social links",
    link: `${SITE_URL}/docs`,
    guid: "poc:docs-social",
    date: "2026-09-29T22:40:17Z",
    description:
      "GitBook published in English and Chinese, GitHub best-practice scaffolding added (LICENSE, CI, SECURITY), and official GitHub, X and Telegram links wired into the site.",
  },
  {
    title: "Battle v2 — elements, skills and variance; redeploy t7",
    link: `${SITE_URL}/battle`,
    guid: "poc:battle-v2",
    date: "2026-09-29T08:28:41Z",
    description:
      "Battle v2 adds 4 elements / 5 skills derived from the card seed and an attack variance of ±40%; master-referral 3/7, PvP rake 70/30 to treasury/pool and difficulty +0.33 bit per price era. Redeployed as stack t7.",
  },
  {
    title: "v7 art pack — full modular dragons + pack-opening reveal",
    link: `${SITE_URL}/mine`,
    guid: "poc:art-v7",
    date: "2026-09-28T17:02:42Z",
    description:
      "Integrated the v7 art pack (fully modular dragons, 512 layers) across all 16 species and shipped the pack-opening reveal on /mine, decoding real card ids from the PackOpened event.",
  },
  {
    title: "Audit fixes, t6 redeploy, keeper cron and battle feeds",
    link: `${SITE_URL}/battle`,
    guid: "poc:audit-keeper",
    date: "2026-09-28T15:39:34Z",
    description:
      "Security-audit fixes landed (chip burn, merge invariant, mergeFailBps, Points/Chip ownership), a permissionless keeper now pumps pool dividends to stakers, and a live battle feed shipped on /battle. Redeployed as stack t6.",
  },
  {
    title: "Spirit Cards redesign + v3 art (16 species)",
    link: `${SITE_URL}/`,
    guid: "poc:art-v3",
    date: "2026-09-28T14:15:04Z",
    description:
      "The site was rebranded to Spirit Cards and rebuilt around the POC flow; the v3 art pack ships 16 species (8 universal + 8 attack dragons) rendered deterministically from seedOf.",
  },
  {
    title: "Staked cards can fight in duels; redeploy t5",
    link: `${SITE_URL}/battle`,
    guid: "poc:staked-battles",
    date: "2026-09-25T15:27:29Z",
    description:
      "Cards locked in the StakeVault can now be sent into duels without unstaking, verified with a live on-chain smoke test. Redeployed as stack t5.",
  },
  {
    title: "Batch unstake/claim and pool dashboard; redeploy t4",
    link: `${SITE_URL}/stake`,
    guid: "poc:batch-pool",
    date: "2026-09-24T18:41:22Z",
    description:
      "Bulk unstake and claim across positions plus a stake-pool dashboard; stat-based battle and a battle rating table (W/L, lives, score). Redeployed as stack t4.",
  },
  {
    title: "Card Packs (5/10/25/50/100) and Battle.cancelDuel; redeploy t2",
    link: `${SITE_URL}/mine`,
    guid: "poc:packs",
    date: "2026-09-24T17:49:32Z",
    description:
      "Buyable card packs in bundles of 5/10/25/50/100, with Battle.cancelDuel to unwind an open duel. Wired into the /mine buy-pack and /battle cancel flows. Redeployed as stack t2.",
  },
  {
    title: "Auto-mining console on /mine",
    link: `${SITE_URL}/mine`,
    guid: "poc:auto-mining",
    date: "2026-09-24T17:17:15Z",
    description:
      "The browser console on /mine grinds keccak proof-of-work in a background worker and submits the winning nonce on-chain to mint a card.",
  },
  {
    title: "Spirit Cards — core on Robinhood Chain",
    link: `${SITE_URL}/`,
    guid: "poc:deploy",
    date: "2026-09-24T15:49:37Z",
    description:
      "SpiritCards core, Config, ChipToken, StakeVault, Battle and Points deployed on Robinhood Chain. Mine with keccak proof of work; merge, stake and battle cards. Later redeployed as t2…t7.",
  },
];

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

export function GET() {
  const lastBuildDate = rfc822(MILESTONES[0].date);
  const items = MILESTONES.map(
    (m) => `    <item>
      <title>${esc(m.title)}</title>
      <link>${esc(m.link)}</link>
      <guid isPermaLink="false">${esc(m.guid)}</guid>
      <pubDate>${rfc822(m.date)}</pubDate>
      <description>${esc(m.description)}</description>
    </item>`,
  ).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Spirit Cards — changelog</title>
    <link>${esc(SITE_URL)}/</link>
    <description>Shipped milestones for Spirit Cards — a proof-of-work minted collectible card collection on Robinhood Chain.</description>
    <language>en</language>
    <atom:link href="${esc(FEED_URL)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
