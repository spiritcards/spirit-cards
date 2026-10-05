import type { Address } from "viem";
import { CANON_CORE } from "./canonical";

/**
 * Deployed SpiritCards core on Robinhood Chain (POC canon).
 * Default comes from the single source of truth (./canonical.ts).
 * Override with NEXT_PUBLIC_CONTRACT_ADDRESS if the contract is redeployed.
 */
export const CONTRACT_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() as Address | undefined) ||
  CANON_CORE;

/** Chain id of the configured network (env-driven, see ./rh-chain.ts). */
export { RH_CHAIN_ID } from "./rh-chain";

/**
 * ABI surface for the SpiritCards core.
 *
 * `POW_MINT_NFT_ABI` is kept as a back-compat alias so the shared helpers
 * (lib/pow.ts, lib/owned-ids.ts) keep working unchanged; both names point at
 * the same SpiritCards ABI.
 */
export { PROOF_OF_CARD_ABI } from "./poc-abis";
export { PROOF_OF_CARD_ABI as POW_MINT_NFT_ABI } from "./poc-abis";
