import {
  createPublicClient,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import { rhChain, RH_RPC_URL } from "./rh-chain";
import { rpcFetch } from "./rpc";
import {
  ADDRESSES,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
  CHIP_ABI,
  STAKE_VAULT_ABI,
  BATTLE_ABI,
  POINTS_ABI,
  PACKS_ABI,
} from "./poc-abis";

/**
 * poc.ts — shared Spirit Cards (Robinhood Chain) access layer.
 *
 * Every server/client module that talks to the new contract stack reads its
 * addresses + ABIs from here (never hardcode). Addresses themselves come from
 * the single source of truth `lib/poc-abis.ts` (ADDRESSES) which mirrors
 * `lib/canonical.ts`.
 */

export {
  ADDRESSES,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
  CHIP_ABI,
  STAKE_VAULT_ABI,
  BATTLE_ABI,
  POINTS_ABI,
  PACKS_ABI,
};

/** The single chip id in ChipToken (ERC-1155). */
export const CHIP_ID = 0n;

/** Number of staking tiers in Config (0..5). */
export const TIER_COUNT = 6;

/** Core contract address. */
export const CORE_ADDRESS: Address = getAddress(ADDRESSES.core);
/** Config contract address. */
export const CONFIG_ADDRESS: Address = getAddress(ADDRESSES.config);
/** ChipToken (ERC-1155) address. */
export const CHIP_ADDRESS: Address = getAddress(ADDRESSES.chip);
/** StakeVault address. */
export const VAULT_ADDRESS: Address = getAddress(ADDRESSES.vault);
/** Battle address. */
export const BATTLE_ADDRESS: Address = getAddress(ADDRESSES.battle);
/** Points address. */
export const POINTS_ADDRESS: Address = getAddress(ADDRESSES.points);
/** Packs address. */
export const PACKS_ADDRESS: Address = getAddress(ADDRESSES.packs);

/** Read-only viem client for the configured Robinhood Chain RPC. */
export function getPublicClient() {
  return createPublicClient({
    chain: rhChain,
    // Collapse concurrent reads into Multicall3 calls (rhChain defines
    // multicall3). Without this, every `Promise.all(readContract…)` fires N
    // separate HTTP requests — the Battle page alone scheduled ~6000.
    batch: { multicall: true },
    transport: http(RH_RPC_URL, { timeout: 8_000, fetchFn: rpcFetch(2) }),
  });
}

const CACHE_TTL_MS = 60_000;

export type CollectionStats = {
  totalMinted: bigint;
  maxSupply: bigint;
  currentPrice: bigint;
  baseBits: number;
  mineCooldown: bigint;
  mergeFee: bigint;
  eraPrice: bigint;
  priceStepBps: bigint;
  chipDiscountBps: bigint;
  paused: boolean;
};

const globalCache = globalThis as typeof globalThis & {
  __pocStatsCache?: { expiresAt: number; value: CollectionStats };
};

/**
 * Collection-wide reads (Config + core), cached 60 s server-side. Shared by
 * the metadata routes, sitemap, stats snapshot and the MCP-free API.
 */
export async function getCollectionStats(): Promise<CollectionStats> {
  const cached = globalCache.__pocStatsCache;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const client = getPublicClient();
  const [totalMinted, currentPrice, baseBits, mineCooldown, mergeFee, eraPrice, priceStepBps, maxSupply, chipDiscountBps, paused] =
    await Promise.all([
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "totalMinted" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "currentPrice" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "requiredBits" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "mineCooldown" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "mergeFee" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "eraPrice" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "priceStepBps" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "maxSupply" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "chipDiscountBps" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "paused" }),
    ]);

  const value: CollectionStats = {
    totalMinted,
    maxSupply,
    currentPrice,
    baseBits: Number(baseBits),
    mineCooldown,
    mergeFee,
    eraPrice,
    priceStepBps,
    chipDiscountBps,
    paused,
  };
  globalCache.__pocStatsCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export type OnChainToken = {
  /** Raw `seedOf[id]` — deterministic card seed. */
  seed: Hex;
  owner: Address;
};

/** Per-token reads used by /api/meta and /api/image. Cached 60 s. */
export async function getOnChainToken(tokenId: bigint): Promise<OnChainToken> {
  const client = getPublicClient();
  const [seed, owner] = await Promise.all([
    client.readContract({
      address: CORE_ADDRESS,
      abi: PROOF_OF_CARD_ABI,
      functionName: "seedOf",
      args: [tokenId],
    }),
    client.readContract({
      address: CORE_ADDRESS,
      abi: PROOF_OF_CARD_ABI,
      functionName: "ownerOf",
      args: [tokenId],
    }),
  ]);
  return { seed, owner };
}

export type CardStats = { hp: number; atk: number; def: number; rarity: number };

/** On-chain battle profile for a card (`Battle.statsOf`) — the card's HP/ATK/DEF/rarity. */
export async function getCardStats(tokenId: bigint): Promise<CardStats> {
  const client = getPublicClient();
  const [hp, atk, def, rarity] = await client.readContract({
    address: BATTLE_ADDRESS,
    abi: BATTLE_ABI,
    functionName: "statsOf",
    args: [tokenId],
  });
  return { hp: Number(hp), atk: Number(atk), def: Number(def), rarity: Number(rarity) };
}

export function parseTokenId(value: string): bigint | null {
  if (!/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/** Deterministic seed for a token id (used by the placeholder art renderer). */
export function seedHexToBytes(seed: Hex): Uint8Array {
  const hex = seed.slice(2);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
