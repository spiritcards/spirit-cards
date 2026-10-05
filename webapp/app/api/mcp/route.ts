import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getCollectionStats,
  getOnChainToken,
  getCardStats,
  parseTokenId,
  CORE_ADDRESS,
  CONFIG_ADDRESS,
  VAULT_ADDRESS,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
  STAKE_VAULT_ABI,
} from "@/lib/poc";
import { computeWork, leadingZeroBits } from "@/lib/pow";
import { deriveCard, statsFromSeed, speciesList, RARITY_TIERS } from "@/lib/seed-traits";
import { fetchAllPoints } from "@/lib/points";
import { getRecentActivity } from "@/lib/recent";
import { getPublicClient } from "@/lib/poc";
import { RH_CHAIN_ID, CONTRACT_ADDRESS } from "@/lib/contract";
import { RH_EXPLORER_URL } from "@/lib/rh-chain";
import { SITE_URL, SITE_NAME, SOCIAL_LINKS } from "@/lib/site";
import { concatHex, keccak256, toBytes, toHex, type Address, type Hex } from "viem";

/** The four battle elements (Battle.sol ELEMENT_COUNT = 4), RPS cycle: Ember > Stone > Gale > Tide > Ember. */
const BATTLE_ELEMENTS = ["Ember", "Stone", "Gale", "Tide"] as const;

/**
 * Fast leading-zero-bit count straight off the hash hex — byte-for-byte identical
 * to `leadingZeroBits` (lib/pow) but without the per-iteration BigInt. Used only
 * as a cheap pre-filter inside the find_nonce grind; the accepted result is always
 * re-verified with the canonical `computeWork` + `leadingZeroBits`. [proven: matches
 * leadingZeroBits on 100k random + crafted inputs]
 */
function leadingZeroBitsHex(hex: Hex): number {
  const s = hex.slice(2);
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const nib = parseInt(s[i], 16);
    if (nib === 0) {
      bits += 4;
      continue;
    }
    bits += Math.clz32(nib) - 28;
    break;
  }
  return bits;
}

/**
 * /api/mcp — read-only Model Context Protocol server for Spirit Cards.
 *
 * Exposes the same on-chain reads as the HTTP API as MCP tools, so LLM clients
 * (Claude Desktop, Cursor, …) can call them directly. Stateless Streamable HTTP
 * via `mcp-handler` (serves both the 2026-07-28 spec and 2025-era clients).
 *
 * Read-only and anonymous: no keys, no accounts, no wallet, no writes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const text = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_collection_stats",
      {
        title: "Collection stats",
        description:
          "Live collection statistics for Spirit Cards: total minted, max supply, current mint price (ETH), " +
          "difficulty (requiredBits/baseBits), cooldown, merge fee, burned/forged counters, paused flag, chainId and contract.",
        inputSchema: z.object({}),
      },
      async () => {
        const [s, client] = [await getCollectionStats(), getPublicClient()];
        const [burned, forged] = await Promise.all([
          client
            .readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "burned" })
            .catch(() => 0n),
          client
            .readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "forged" })
            .catch(() => 0n),
        ]);
        return text({
          chainId: RH_CHAIN_ID,
          contract: CORE_ADDRESS,
          totalMinted: Number(s.totalMinted),
          maxSupply: Number(s.maxSupply),
          currentPriceWei: s.currentPrice.toString(),
          requiredBits: s.baseBits,
          mineCooldownSeconds: Number(s.mineCooldown),
          mergeFeeWei: s.mergeFee.toString(),
          burned: Number(burned),
          forged: Number(forged),
          paused: s.paused,
        });
      },
    );

    server.registerTool(
      "get_card",
      {
        title: "Get card",
        description:
          "Full profile of a Spirit Cards token by id: species, element, rarity tier, HP/ATK/DEF, and the " +
          "deterministic on-chain seed. Works for any minted token id.",
        inputSchema: z.object({
          tokenId: z.union([z.string(), z.number()]).describe("Token id (unsigned integer)"),
        }),
      },
      async ({ tokenId }) => {
        const id = parseTokenId(String(tokenId));
        if (id === null) {
          return { content: [{ type: "text" as const, text: "tokenId must be an unsigned integer" }], isError: true };
        }
        try {
          const { seed } = await getOnChainToken(id);
          const card = deriveCard(seed, id);
          const stats = await getCardStats(id).catch(() => statsFromSeed(seed));
          return text({
            tokenId: id.toString(),
            species: card.species.name,
            element: card.species.element,
            rarityTier: card.rarityTier,
            rarity: card.rarity,
            hp: stats.hp,
            atk: stats.atk,
            def: stats.def,
            seed,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown";
          return { content: [{ type: "text" as const, text: `Card not found: ${message}` }], isError: true };
        }
      },
    );

    server.registerTool(
      "verify_nonce",
      {
        title: "Verify nonce",
        description:
          "Recompute the proof-of-work for a (miner, nonce) pair exactly as the contract does: " +
          "work = keccak256(chainId ‖ contract ‖ miner ‖ nonce). Returns the hash, its leading-zero-bit count, " +
          "the current requiredBits threshold, and whether it would be accepted on-chain.",
        inputSchema: z.object({
          miner: z.string().describe("Miner address (0x…)"),
          nonce: z.union([z.string(), z.number()]).describe("Nonce (unsigned integer)"),
        }),
      },
      async ({ miner, nonce }) => {
        const address = miner as Address;
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
          return { content: [{ type: "text" as const, text: "miner must be a 0x address" }], isError: true };
        }
        const n = BigInt(String(nonce));
        const work = computeWork(address, n);
        const bits = leadingZeroBits(work);
        const required = (await getCollectionStats()).baseBits;
        return text({
          miner: address,
          nonce: n.toString(),
          work,
          leadingZeroBits: bits,
          requiredBits: required,
          valid: bits >= required,
          chainId: RH_CHAIN_ID,
          contract: CORE_ADDRESS,
        });
      },
    );

    server.registerTool(
      "get_leaderboard",
      {
        title: "Activity leaderboard",
        description: "On-chain activity-points leaderboard (mine/merge/stake/pvp-win points), top N wallets.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(200).default(25).describe("Max rows (1–200)"),
        }),
      },
      async ({ limit }) => {
        const snapshot = await fetchAllPoints();
        const rows = snapshot.wallets.slice(0, limit);
        return text({
          computedAtBlock: snapshot.computedAtBlock,
          totals: snapshot.totals,
          count: rows.length,
          leaderboard: rows,
        });
      },
    );

    server.registerTool(
      "get_pool",
      {
        title: "Staking pool",
        description:
          "Staking-pool / dividend status: accrued pool, split shares, vault total weight, undistributed rewards.",
        inputSchema: z.object({}),
      },
      async () => {
        const client = getPublicClient();
        const [accruedPool, pooled, poolBps, referralBps, houseBps, reserveBps, totalWeight, undistributed, accRewardPerWeight] =
          await Promise.all([
            client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "accruedPool" }),
            client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "accruedHouse" }),
            client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "poolBps" }),
            client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "referralBps" }),
            client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "houseBps" }),
            client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "reserveBps" }),
            client.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "totalWeight" }),
            client.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "undistributed" }),
            client.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "accRewardPerWeight" }),
          ]);
        return text({
          accruedPoolWei: accruedPool.toString(),
          accruedHouseWei: pooled.toString(),
          splitBps: { pool: Number(poolBps), referral: Number(referralBps), house: Number(houseBps), reserve: Number(reserveBps) },
          vault: {
            totalWeight: totalWeight.toString(),
            undistributedWei: undistributed.toString(),
            accRewardPerWeight: accRewardPerWeight.toString(),
          },
        });
      },
    );

    server.registerTool(
      "get_recent_activity",
      {
        title: "Recent activity",
        description: "Recent on-chain activity (mints / pack opens) from the latest blocks.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(50).default(10).describe("Max events (1–50)"),
        }),
      },
      async ({ limit }) => text({ events: await getRecentActivity(limit) }),
    );

    server.registerTool(
      "get_project_info",
      {
        title: "Project info",
        description:
          "What Spirit Cards is: the game, the five-node loop (mine → merge → battle → stake → points), " +
          "the chain (Robinhood Chain, CORE contract, explorer, ETH gas), official links, the collection " +
          "(species / rarity tiers / battle elements) and the key economy (max supply, price step, fee split). " +
          "Call get_mining_guide to start mining.",
        inputSchema: z.object({}),
      },
      async () => {
        const client = getPublicClient();
        const s = await getCollectionStats();
        const [poolBps, referralBps, houseBps, reserveBps] = await Promise.all([
          client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "poolBps" }).catch(() => 6000n),
          client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "referralBps" }).catch(() => 1000n),
          client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "houseBps" }).catch(() => 3000n),
          client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "reserveBps" }).catch(() => 0n),
        ]);
        return text({
          name: SITE_NAME,
          game:
            "Spirit Cards is a collectible creature-card game on Robinhood Chain. You mine a keccak " +
            "proof-of-work nonce; the winning hash becomes your card's deterministic on-chain seed. Cards " +
            "merge, battle, stake and earn activity points.",
          loop: ["mine", "merge", "battle", "stake", "points"],
          chain: {
            name: "Robinhood Chain",
            chainId: RH_CHAIN_ID,
            gasToken: "ETH",
            contract: CORE_ADDRESS,
            explorer: RH_EXPLORER_URL,
          },
          links: [
            { label: `${SITE_NAME} (website)`, href: SITE_URL },
            ...SOCIAL_LINKS.map((l) => ({ label: l.label, href: l.href })),
          ],
          collection: {
            species: speciesList.length,
            rarityTiers: RARITY_TIERS.length,
            battleElements: BATTLE_ELEMENTS.length,
          },
          economy: {
            maxSupply: Number(s.maxSupply),
            currentPriceWei: s.currentPrice.toString(),
            eraPriceWei: s.eraPrice.toString(),
            priceStepBps: Number(s.priceStepBps),
            feeSplitBps: {
              pool: Number(poolBps),
              referral: Number(referralBps),
              house: Number(houseBps),
              reserve: Number(reserveBps),
            },
          },
          live: {
            totalMinted: Number(s.totalMinted),
            maxSupply: Number(s.maxSupply),
          },
          next: "Call get_mining_guide to start mining.",
        });
      },
    );

    server.registerTool(
      "get_mining_guide",
      {
        title: "How to start mining",
        description:
          "Step-by-step guide to mine a Spirit Card: the exact proof-of-work rule, the live difficulty / price / " +
          "cooldown / chip discount, where to get a miner (browser at /mine, public CLI), the exact contract call, " +
          "and how to get a valid nonce with the find_nonce tool.",
        inputSchema: z.object({}),
      },
      async () => {
        const s = await getCollectionStats();
        const requiredBits = s.baseBits;
        const rule =
          "work = keccak256(abi.encodePacked(uint256 chainId, address core, address miner, uint256 nonce)); " +
          "valid iff leadingZeroBits(work) >= requiredBits()";
        const steps = [
          `Get a miner: open the browser miner at ${SITE_URL}/mine, or use the public CLI (github.com/spiritcards/spirit-cards, miner/).`,
          `Learn the rule: ${rule}.`,
          "Grind a nonce: call the find_nonce tool with your wallet address (miner) — it returns a valid nonce for the current difficulty.",
          `Build the transaction: call mine(nonce, useChip) on the core contract ${CORE_ADDRESS} with msg.value == currentPrice() (${s.currentPrice.toString()} wei), or the chip-discounted value when useChip=true (consumes 1 chip).`,
          `Respect on-chain limits: the nonce must be unused for that wallet (nonceUsed[miner][nonce]) and each wallet must wait mineCooldown = ${Number(s.mineCooldown)}s between mints (lastMintAt[miner]); minting is capped at maxSupply = ${Number(s.maxSupply)}.`,
          "Verify first: call verify_nonce with the (miner, nonce) pair to confirm leadingZeroBits(work) >= requiredBits before sending.",
        ];
        const call =
          `mine(uint256 nonce, bool useChip) payable on ${CORE_ADDRESS} — msg.value must equal currentPrice() ` +
          `(${s.currentPrice.toString()} wei), or the chip-discounted price when useChip=true (consumes 1 chip). ` +
          `nonce must be unused (nonceUsed[miner][nonce]); a per-wallet cooldown of ${Number(s.mineCooldown)}s applies between mints.`;
        const summary =
          `Spirit Cards mining is a keccak proof-of-work: grind a nonce where ` +
          `leadingZeroBits(keccak256(chainId ‖ core ‖ miner ‖ nonce)) >= ${requiredBits}. ` +
          `At the live difficulty (${requiredBits} bits) that is ~2^${requiredBits} hashes on average. ` +
          `Then call mine(nonce, useChip) with msg.value == ${s.currentPrice.toString()} wei (or the chip-discounted ` +
          `value when useChip=true), respecting the ${Number(s.mineCooldown)}s per-wallet cooldown. ` +
          `Use find_nonce to get a nonce and verify_nonce to check it before sending.`;
        return text({
          rule,
          live: {
            requiredBits,
            priceWei: s.currentPrice.toString(),
            cooldownSeconds: Number(s.mineCooldown),
            chipDiscountBps: Number(s.chipDiscountBps),
          },
          steps,
          call,
          tools: ["find_nonce", "verify_nonce", "get_collection_stats"],
          summary,
        });
      },
    );

    server.registerTool(
      "find_nonce",
      {
        title: "Find a valid nonce",
        description:
          "Grind a proof-of-work nonce for a miner address so it can mint immediately: work = " +
          "keccak256(chainId ‖ core ‖ miner ‖ nonce), using the live requiredBits threshold. Returns the first nonce " +
          "whose work has at least requiredBits leading zero bits, within a ~20 s wall-clock cap. If the difficulty " +
          "is high it may return found:false — retry or lower maxAttempts.",
        inputSchema: z.object({
          miner: z.string().describe("Miner address (0x…)"),
          maxAttempts: z
            .number()
            .int()
            .min(1000)
            .max(5_000_000)
            .default(1_000_000)
            .describe("Maximum number of nonces to try (1000–5,000,000)"),
        }),
      },
      async ({ miner, maxAttempts }) => {
        const address = miner as Address;
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
          return { content: [{ type: "text" as const, text: "miner must be a 0x address" }], isError: true };
        }
        const requiredBits = (await getCollectionStats()).baseBits;
        const WALL_MS = 20_000;
        const startedAt = Date.now();
        // Pre-build the 72-byte prefix chainId ‖ core ‖ miner once (identical bytes
        // to computeWork's head). Each iteration only overwrites the 4-byte nonce
        // tail, so the grind avoids per-hash concatHex/toHex allocation. The found
        // candidate is re-verified with the canonical computeWork + leadingZeroBits.
        const prefix = toBytes(concatHex([toHex(RH_CHAIN_ID, { size: 32 }), CONTRACT_ADDRESS, address]));
        const msg = new Uint8Array(prefix.length + 32);
        msg.set(prefix, 0);
        let attempts = 0;
        let foundNonce: bigint | null = null;
        for (let i = 0; i < maxAttempts; i++) {
          msg[msg.length - 4] = (i >>> 24) & 0xff;
          msg[msg.length - 3] = (i >>> 16) & 0xff;
          msg[msg.length - 2] = (i >>> 8) & 0xff;
          msg[msg.length - 1] = i & 0xff;
          attempts = i + 1;
          if (leadingZeroBitsHex(keccak256(msg)) >= requiredBits) {
            // Cheap pre-filter passed — confirm against the canonical helpers.
            const nonce = BigInt(i);
            if (leadingZeroBits(computeWork(address, nonce)) >= requiredBits) {
              foundNonce = nonce;
              break;
            }
          }
          // Wall-clock guard so the request finishes well within maxDuration = 30s.
          if ((i & 0xfff) === 0xfff && Date.now() - startedAt > WALL_MS) break;
        }
        // Report canonical proof-of-work for the found nonce (or the last tried one).
        const reportedNonce = foundNonce === null ? BigInt(Math.max(0, attempts - 1)) : foundNonce;
        const work: Hex = computeWork(address, reportedNonce);
        const bits = leadingZeroBits(work);
        const elapsedMs = Date.now() - startedAt;
        const found = foundNonce !== null;
        return text({
          miner: address,
          nonce: foundNonce === null ? "" : foundNonce.toString(),
          work,
          leadingZeroBits: bits,
          requiredBits,
          attempts,
          elapsedMs,
          found,
          ...(found
            ? {}
            : {
                retry:
                  `No nonce with >= ${requiredBits} leading zero bits found after ${attempts} attempts ` +
                  `(~${elapsedMs} ms). The expected work is ~2^${requiredBits} hashes; retry, start from a different ` +
                  `nonce range, or run a longer/parallel grind in the browser miner (${SITE_URL}/mine) or the CLI. ` +
                  `Lowering maxAttempts does not lower the difficulty — the threshold comes from the live requiredBits().`,
              }),
        });
      },
    );

    server.registerPrompt(
      "project_overview",
      {
        title: "Project overview",
        description: "Ask the assistant to summarize Spirit Cards for a newcomer.",
        // `.default({})` so clients that omit `arguments` for a no-arg prompt still validate.
        argsSchema: z.object({}).default({}),
      },
      () => ({
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                "Give me a clear, factual overview of Spirit Cards for someone brand new to it. First call the " +
                "get_project_info tool and the get_collection_stats tool, then summarize: what the game is; the " +
                "mine → merge → battle → stake → points loop; the chain (Robinhood Chain, the core contract address, " +
                "the explorer, ETH as gas); the official links; the collection (number of species, rarity tiers and " +
                "battle elements); and the key economy numbers (max supply, current mint price, fee split). " +
                "Keep it factual — no financial promises, no price predictions. Finish by telling me how to start mining.",
            },
          },
        ],
      }),
    );

    server.registerPrompt(
      "start_mining",
      {
        title: "Start mining",
        description: "Ask the assistant to walk through mining a Spirit Card end to end.",
        // `.default({})` so clients that omit `arguments` still validate (wallet is optional).
        argsSchema: z
          .object({
            wallet: z.string().optional().describe("Optional miner wallet address (0x…) to grind a nonce for"),
          })
          .default({}),
      },
      ({ wallet }) => {
        const walletText =
          wallet && wallet.trim().length > 0
            ? `My wallet address is ${wallet}.`
            : "I have not provided a wallet address.";
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text:
                  "Walk me through mining a Spirit Card step by step. First call the get_mining_guide tool and " +
                  "summarize the exact proof-of-work rule plus the live difficulty, mint price and cooldown. " +
                  `${walletText} Then call the find_nonce tool with that wallet as the miner to get a valid nonce ` +
                  "(if I did not give a wallet, ask me for my 0x address first, or explain that I need one). Finally " +
                  "explain the exact mint transaction I must send: the mine(nonce, useChip) call, the contract address, " +
                  "the exact msg.value / chip discount, and the cooldown I must respect. Be factual — no financial promises.",
              },
            },
          ],
        };
      },
    );
  },
  {
    serverInfo: { name: "spirit-cards", version: "1.0.0" },
  },
);

export { handler as GET, handler as POST, handler as DELETE };
