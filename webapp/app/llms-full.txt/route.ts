import { SITE_URL } from "@/lib/site";
import { CORE_ADDRESS, CONFIG_ADDRESS, CHIP_ADDRESS, VAULT_ADDRESS, BATTLE_ADDRESS, POINTS_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID, RH_EXPLORER_URL } from "@/lib/rh-chain";

/**
 * /llms-full.txt — complete agent-readable documentation for Spirit Cards.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards — full documentation

> Spirit Cards is a proof-of-work minted collectible-card collection on Robinhood Chain (chainId ${RH_CHAIN_ID}, native ETH gas). Instead of buying randomness, holders mine a keccak-256 nonce; the valid nonce's hash is recorded on-chain as the card's seed (seedOf). Cards can be merged (2 -> 1), staked for rewards, and battled in PvP duels.

Canonical URLs
- Site: ${SITE_URL}/
- Index for agents: ${SITE_URL}/llms.txt
- Service discovery: ${SITE_URL}/.well-known/ai.json
- OpenAPI: ${SITE_URL}/openapi.yaml
- Changelog (RSS): ${SITE_URL}/changelog.xml
- Markdown pages: ${SITE_URL}/index.md, /mine.md, /collection.md, /merge.md, /stake.md, /battle.md, /points.md

## 1. Contracts (Robinhood Chain, chainId ${RH_CHAIN_ID})

- SpiritCards (core): ${CORE_ADDRESS}
- Config: ${CONFIG_ADDRESS}
- ChipToken (ERC-1155, chip id 0): ${CHIP_ADDRESS}
- StakeVault: ${VAULT_ADDRESS}
- Battle: ${BATTLE_ADDRESS}
- Points: ${POINTS_ADDRESS}
- Explorer: ${RH_EXPLORER_URL}

## 2. Proof of work

    work = keccak256(abi.encodePacked(uint256 chainId, address core, address miner, uint256 nonce))
    valid <=> leadingZeroBits(work) >= Config.baseBits()

- Nonces are single-use per wallet (nonceUsed[miner][nonce]).
- core.workFor(miner, nonce) is a view that returns the same hash.
- core.requiredBits() returns the current base-bit bar.

## 3. Mining

- mine(uint256 nonce, bool useChip) payable
- msg.value must equal currentPrice(); with useChip == true it must equal the discounted price (Config.chipDiscountBps, and the caller must hold a chip).
- Reads: currentPrice(), totalMinted(), lastMintAt(address), Config.baseBits(), Config.mineCooldown().
- Event: Mined(address indexed miner, uint256 indexed tokenId, uint256 nonce, bytes32 work, uint256 bits, uint256 paid).

## 4. Merging

- mergeBurn(uint256 a, uint256 b) payable; msg.value must equal Config.mergeFee().
- Burns two cards the caller owns and forges one child; event Merged(a, b, child, fee).

## 5. Staking

- Approve the vault first: core.setApprovalForAll(vault, true).
- stake(uint256 tokenId, uint256 tier); unstake(uint256 tokenId); claim(uint256 tokenId); pending(uint256 tokenId).
- stakes(uint256) -> (user, tier, weight, stakedAt, rewardDebt, active); totalWeight().
- Tiers 0..5; lock lengths and weights from Config.tierLock(i) / tierWeightX1000(i).

## 6. Battle

- createDuel(uint256 cardA, uint256 stake) payable -> id; acceptDuel(uint256 id, uint256 cardB) payable.
- duels(uint256) -> (a, cardA, stake, open); duelCount(); wins(card), losses(card), lives(card).

## 7. Points

- Points.points(address) is the authoritative per-wallet balance.
- Event: PointsAdded(address indexed user, uint256 amount, bytes32 reason).

## 8. Metadata & API

- GET ${SITE_URL}/api/meta/{id} — OpenSea-compatible metadata (seed-based).
- GET ${SITE_URL}/api/image/{id} — deterministic placeholder PNG (seed-derived). Add ?w=<px> for a thumbnail.
- GET ${SITE_URL}/api/points — points dataset; ?address=0x… for one wallet. Includes the registered AI-agent registry merged with the on-chain leaderboard (registered wallets without activity are listed with zeroes).
- GET ${SITE_URL}/api/pool — staking pool / revenue split snapshot (accrued pool and house revenue, split shares, vault weight).
- GET ${SITE_URL}/stats/current.json — collection snapshot.

## 9. AI agents

- Agent registry: any wallet can register self-serve. POST ${SITE_URL}/api/points/register with JSON {name, address, description, links?, message, signature}.
- The signed message (EIP-191 personal_sign) is exactly four lines:
  Spirit Cards — agent registration / address: <lowercase address> / name: <name> / timestamp: <unix seconds>.
- Responses: 200 registered; 400 invalid body; 401 bad signature or stale timestamp; 429 rate limited; 503 registry storage not provisioned.
- Registered wallets merge into the leaderboard automatically (ranking is purely on-chain activity; no boosts are for sale).
- MCP server: read-only Model Context Protocol (Streamable HTTP) at ${SITE_URL}/api/mcp — tools: get_project_info, get_collection_stats, get_card, verify_nonce, find_nonce, get_mining_guide, get_leaderboard, get_pool, get_recent_activity; prompts: project_overview, start_mining. Stateless, anonymous, no keys. stdio-only clients can bridge via \`npx mcp-remote <url>\`.

## 10. Status

Cards mint from proof of work; art is a deterministic placeholder derived from seedOf until the final trait set ships. All pages read live on-chain state. The agent registry, MCP server and machine-readable discovery files (llms.txt, ai.json, OpenAPI, changelog RSS) are live.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
