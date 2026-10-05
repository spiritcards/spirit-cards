import { SITE_URL } from "@/lib/site";
import { CORE_ADDRESS, CONFIG_ADDRESS, CHIP_ADDRESS, VAULT_ADDRESS, BATTLE_ADDRESS, POINTS_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID, RH_EXPLORER_URL } from "@/lib/rh-chain";
import { CANON_VERSION } from "@/lib/canonical";

/**
 * /.well-known/ai.json — service discovery for AI agents (RFC 8615 style).
 *
 * All network facts (chain id, addresses, canon version) come from the
 * canonical app config. The rehearsal → mainnet switch is a single config
 * change (NEXT_PUBLIC_RH_CHAIN_ID + canonical.ts addresses): this file needs
 * no edits at launch.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

const IS_MAINNET = RH_CHAIN_ID === 4663;

const LAUNCH_NOTE = IS_MAINNET
  ? "Live on Robinhood Chain mainnet (chainId 4663). Art is a deterministic placeholder derived from the seed until the POC trait set ships."
  : `Live on Robinhood Chain testnet (chainId ${RH_CHAIN_ID}) — rehearsal deployment of the mainnet stack; the contract addresses below are testnet ones. Mainnet addresses replace them at launch, no schema changes.`;

export function GET() {
  return Response.json(
    {
      name: "Spirit Cards",
      description:
        "Proof-of-work minted collectible cards on Robinhood Chain. Mine a keccak nonce; a valid nonce is stored on-chain as the card seed (seedOf). Merge, stake and battle your cards.",
      version: CANON_VERSION,
      site: SITE_URL,
      llms: {
        index: `${SITE_URL}/llms.txt`,
        full: `${SITE_URL}/llms-full.txt`,
        markdown: {
          index: `${SITE_URL}/index.md`,
          mine: `${SITE_URL}/mine.md`,
          collection: `${SITE_URL}/collection.md`,
          merge: `${SITE_URL}/merge.md`,
          stake: `${SITE_URL}/stake.md`,
          battle: `${SITE_URL}/battle.md`,
          points: `${SITE_URL}/points.md`,
        },
      },
      launch: {
        mode: "live",
        note: LAUNCH_NOTE,
      },
      endpoints: {
        robots: `${SITE_URL}/robots.txt`,
        sitemap: `${SITE_URL}/sitemap.xml`,
        openapi: `${SITE_URL}/openapi.yaml`,
        metadata: `${SITE_URL}/api/meta/{id}`,
        image: `${SITE_URL}/api/image/{id}`,
        points: `${SITE_URL}/points`,
        points_api: `${SITE_URL}/api/points`,
        points_register: `${SITE_URL}/api/points/register`,
        pool: `${SITE_URL}/api/pool`,
        changelog: `${SITE_URL}/changelog.xml`,
        mcp: `${SITE_URL}/api/mcp`,
      },
      agents: {
        registry: `${SITE_URL}/api/points`,
        register: `${SITE_URL}/api/points/register`,
        how: "Self-serve: EIP-191 personal_sign of a 4-line message (address, name, timestamp) — no accounts, no approval, no API keys. Registered wallets merge into the on-chain leaderboard.",
      },
      stats: {
        current: `${SITE_URL}/stats/current.json`,
        history: `${SITE_URL}/stats/history.jsonl`,
      },
      collection: {
        standard: "ERC-721 (ERC-2981 royalties)",
        chain_id: RH_CHAIN_ID,
        chain_name: "Robinhood Chain",
        gas_token: "ETH (18 decimals native)",
        contracts: {
          core: CORE_ADDRESS,
          config: CONFIG_ADDRESS,
          chip: CHIP_ADDRESS,
          vault: VAULT_ADDRESS,
          battle: BATTLE_ADDRESS,
          points: POINTS_ADDRESS,
        },
        explorer: `${RH_EXPLORER_URL}/address/${CORE_ADDRESS}`,
      },
      mechanics: {
        work: "keccak256(abi.encodePacked(uint256 chainId, address core, address miner, uint256 nonce))",
        validity: "leadingZeroBits(work) >= Config.baseBits()",
        mine: "mine(uint256 nonce, bool useChip) payable; msg.value == currentPrice() (discounted with a chip)",
        merge: "mergeBurn(uint256 a, uint256 b) payable; msg.value == Config.mergeFee()",
        stake: "StakeVault.stake(tokenId, tier) after core.setApprovalForAll(vault, true)",
        battle: "Battle.createDuel(cardA, stake) / acceptDuel(id, cardB)",
        art: "deterministic placeholder derived from seedOf (POC traits not shipped yet)",
        mcp: "read-only Model Context Protocol server at /api/mcp — tools: get_project_info, get_collection_stats, get_card, verify_nonce, find_nonce, get_mining_guide, get_leaderboard, get_pool, get_recent_activity; prompts: project_overview, start_mining (anonymous, no keys)",
      },
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
