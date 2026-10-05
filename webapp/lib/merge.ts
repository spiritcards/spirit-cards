import {
  getPublicClient,
  CONFIG_ADDRESS,
  CONFIG_ABI,
  PROOF_OF_CARD_ABI,
} from "./poc";

/**
 * merge.ts — Spirit Cards "merge 2 → 1" (SpiritCards.mergeBurn) helpers.
 *
 * Replaces the old lib/craft.ts. A merge burns two cards the caller
 * owns and forges a new deterministic child; `msg.value` must equal
 * `Config.mergeFee()`.
 */

export { PROOF_OF_CARD_ABI };

/** Live merge fee (wei, native ETH). */
export async function readMergeFee(): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: CONFIG_ADDRESS,
    abi: CONFIG_ABI,
    functionName: "mergeFee",
  });
}
