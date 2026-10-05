import type { Address } from "viem";

/**
 * canonical.ts — SINGLE SOURCE OF TRUTH for the deployed Spirit Cards contract set.
 *
 * Current canon: **Robinhood Chain MAINNET** (chainId 4663), deployed 2026-10-05 (stack t9).
 * (t8 = testnet rehearsal, superseded for the live site.) Marketplace metadata for OpenSea —
 *  ERC-173 `owner()`, EIP-7572 `contractURI()` (data:base64),
 *  ERC-4906 `setBaseURI`. Battle v2; master-ref 3/7; PvP rake 70/30 treasury/pool;
 *  difficulty +0.33 bit/era; eraSize 1111. Owner of `Config` = the Safe below (handover done 2026-10-05).
 */

/** Current deployed contract stack version. */
export const CANON_VERSION = "poc-t9";

/** Robinhood chain id (env-driven): 46630 testnet · 4663 mainnet. */
export const CANON_CHAIN_ID: number = Number(
  process.env.NEXT_PUBLIC_RH_CHAIN_ID?.trim() || 4663,
);

/** SpiritCards core — PoW mint, merge 2->1, packs mint, royalty (ERC-2981), burnCard, withdrawPool. */
export const CANON_CORE: Address = "0x0997DB0BEa2c1278063ebBEc0d1cdbecE7B6F021";

/** Config — tunable params (owner = the Safe below since 2026-10-05). */
export const CANON_CONFIG: Address = "0x678629B80ab8A3Bc049e0FaBca7Aa5De826c8819";

/** ChipToken (ERC-1155) — spin chips (-30% next mine). */
export const CANON_CHIP: Address = "0x1311fb3cfEd5F2163110De0758a6a2A6B9A4aC77";

/** StakeVault — lock tiers + pool dividends (回本) + batch ops + battle lock hooks. */
export const CANON_VAULT: Address = "0x633Fb0B37E7B46Ef877Ec8FB4e2dAadf9deb7E87";

/** Battle — PvP escrow duel (elements/skills/variance) + staked-card support + cancelDuel. */
export const CANON_BATTLE: Address = "0xD7123294A5841B71f51FFf4487b01FfE3B157cdC";

/** Points — activity points / leaderboard. */
export const CANON_POINTS: Address = "0x1791DF764AFdE79a3f190177FA871183d164fb6C";

/** Packs — buy card bundles (5/10/25/50/100). */
export const CANON_PACKS: Address = "0xEBF950Cd7E048Cd36DcEF959a966A102AEA6C98F";

/** Safe 2-of-3 (owner of Config, treasury). */
export const CANON_SAFE: Address = "0x4e85fc9f1b825b51260B07B5936514D5a1c65B04";

/**
 * Log scan floor for the stack (deploy block).
 * t9 (mainnet): 81,009,110. Every history scan starts here (the RPC rejects
 * `eth_getLogs` spans wider than 10M blocks). Previous: t8 testnet 128,670,046.
 */
export const CANON_FROM_BLOCK = 81009110;
