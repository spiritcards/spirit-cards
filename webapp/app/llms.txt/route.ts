import { SITE_URL } from "@/lib/site";
import { CORE_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID, RH_EXPLORER_URL } from "@/lib/rh-chain";

/**
 * /llms.txt — quick, agent-readable index (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards

> Proof of work minted collectible cards on Robinhood Chain (chainId ${RH_CHAIN_ID}, native ETH). Mine a keccak nonce in the browser — the winning hash becomes the card seed. Cards can be merged (2 → 1), staked for rewards, and battled in PvP duels.

Canonical contract: ${CORE_ADDRESS}
Explorer: ${RH_EXPLORER_URL}/address/${CORE_ADDRESS}

## Pages

- [Collection](${SITE_URL}/collection): the live collection grid (one tile per minted card)
- [Mine](${SITE_URL}/mine): grind a PoW nonce and call mine(nonce, useChip)
- [Merge](${SITE_URL}/merge): burn two owned cards into one child (mergeBurn)
- [Stake](${SITE_URL}/stake): lock a card in the StakeVault for pool weight
- [Battle](${SITE_URL}/battle): create/accept PvP duels
- [Points](${SITE_URL}/points): activity points and leaderboard
- [Docs](${SITE_URL}/docs): developer and agent documentation
- [Full documentation](${SITE_URL}/llms-full.txt): complete spec
- [Service discovery](${SITE_URL}/.well-known/ai.json): machine-readable endpoints
- [OpenAPI](${SITE_URL}/openapi.yaml): metadata, image and stats API spec
- [Changelog feed](${SITE_URL}/changelog.xml): RSS of shipped milestones

Markdown versions (same content, text/markdown — also served via Accept negotiation):
- [Home](${SITE_URL}/index.md) · [Mine](${SITE_URL}/mine.md) · [Collection](${SITE_URL}/collection.md) · [Merge](${SITE_URL}/merge.md) · [Stake](${SITE_URL}/stake.md) · [Battle](${SITE_URL}/battle.md) · [Points](${SITE_URL}/points.md)

## API

- [Metadata JSON](${SITE_URL}/api/meta/1): OpenSea-compatible metadata
- [Card image](${SITE_URL}/api/image/1): deterministic placeholder PNG from the seed
- [Points JSON](${SITE_URL}/api/points): activity points dataset — includes the registered AI-agent registry merged with the on-chain leaderboard
- [Agent registration](${SITE_URL}/api/points/register): POST — self-serve, EIP-191 personal_sign of "address/name/timestamp" message; no accounts or API keys
- [Pool JSON](${SITE_URL}/api/pool): staking pool / revenue split snapshot
- [Stats](${SITE_URL}/stats/current.json): machine-readable collection snapshot
- [MCP server](${SITE_URL}/api/mcp): read-only Model Context Protocol tools for LLM clients — get_project_info, get_collection_stats, get_card, verify_nonce, find_nonce, get_mining_guide, get_leaderboard, get_pool, get_recent_activity; prompts: project_overview, start_mining

## Optional

- [Sitemap](${SITE_URL}/sitemap.xml)
- [Robots](${SITE_URL}/robots.txt)

## Mechanics

- work = keccak256(abi.encodePacked(uint256 chainId, address core, address miner, uint256 nonce)); valid iff leadingZeroBits(work) >= Config.baseBits()
- mine(uint256 nonce, bool useChip) payable; msg.value must equal currentPrice() (discounted if useChip)
- mergeBurn(uint256 a, uint256 b) payable; msg.value must equal Config.mergeFee()
- ChipToken (ERC-1155 id 0) gives a mine discount when used
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
