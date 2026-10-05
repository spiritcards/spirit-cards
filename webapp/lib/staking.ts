import {
  getPublicClient,
  VAULT_ADDRESS,
  CONFIG_ADDRESS,
  STAKE_VAULT_ABI,
  CONFIG_ABI,
  PROOF_OF_CARD_ABI,
  TIER_COUNT,
} from "./poc";

/**
 * staking.ts — Spirit Cards StakeVault helpers.
 *
 * The vault stakes one card per `stake(tokenId, tier)` call; the user must
 * first `setApprovalForAll(vault, true)` on the core NFT. Tier lock lengths and
 * weights are read live from Config.
 */

export { VAULT_ADDRESS, STAKE_VAULT_ABI };

/** ERC-721 approval surface on the core, for the setApprovalForAll flow. */
export const ERC721_APPROVAL_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sp", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getApproved",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "op", type: "address" },
      { name: "b", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type StakeTier = {
  id: number;
  /** Lock length in seconds (0 = flexible). */
  lockSeconds: bigint;
  /** Pool weight ×1000. */
  weightX1000: bigint;
};

/** Read all staking tiers (0..5) from Config. */
export async function readStakeTiers(): Promise<StakeTier[]> {
  const client = getPublicClient();
  const tiers = await Promise.all(
    Array.from({ length: TIER_COUNT }, (_, id) => id).map(async (id) => {
      const [lockSeconds, weightX1000] = await Promise.all([
        client.readContract({
          address: CONFIG_ADDRESS,
          abi: CONFIG_ABI,
          functionName: "tierLock",
          args: [BigInt(id)],
        }),
        client.readContract({
          address: CONFIG_ADDRESS,
          abi: CONFIG_ABI,
          functionName: "tierWeightX1000",
          args: [BigInt(id)],
        }),
      ]);
      return { id, lockSeconds, weightX1000 };
    }),
  );
  return tiers;
}

export type StakeInfo = {
  user: string;
  tier: number;
  weight: bigint;
  stakedAt: bigint;
  active: boolean;
};

/** Read `vault.stakes(tokenId)`. */
export async function readStake(tokenId: bigint): Promise<StakeInfo> {
  const client = getPublicClient();
  const [user, tier, weight, stakedAt, , active] = await client.readContract({
    address: VAULT_ADDRESS,
    abi: STAKE_VAULT_ABI,
    functionName: "stakes",
    args: [tokenId],
  });
  return { user, tier: Number(tier), weight, stakedAt, active };
}

/** Pending claimable rewards for a staked token. */
export async function readPending(tokenId: bigint): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: VAULT_ADDRESS,
    abi: STAKE_VAULT_ABI,
    functionName: "pending",
    args: [tokenId],
  });
}

export { PROOF_OF_CARD_ABI };

/** Human label for a lock length. */
export function formatLock(lockSeconds: bigint): string {
  if (lockSeconds <= 0n) return "flexible";
  const days = Number(lockSeconds) / 86_400;
  if (days >= 1) return `${days}d`;
  return `${Number(lockSeconds)}s`;
}

/** Label for a tier id. */
export function tierLabel(id: number): string {
  return `Tier ${id}`;
}

/** Weight ×1000 → human display (e.g. 1500 → "1.5"). */
export function weightLabel(weightX1000: bigint): string {
  return (Number(weightX1000) / 1000).toFixed(2);
}

/** Weight ×1000 → multiplier number (e.g. 5000 → 5). */
export function weightMultiplier(weightX1000: bigint): number {
  return Number(weightX1000) / 1000;
}

/** Short lock label for the tier seals: 0 → "Flex", otherwise "7d"/"30d"/"365d". */
export function shortLock(lockSeconds: bigint): string {
  if (lockSeconds <= 0n) return "Flex";
  const days = Number(lockSeconds) / 86_400;
  return days >= 1 ? `${Math.round(days)}d` : `${Number(lockSeconds)}s`;
}

/**
 * Calendar date when a lock started now would unlock (for the live payoff row).
 * `lockSeconds <= 0` (flexible) unlocks any time. Computed client-side only, so
 * callers should render it after mount to avoid SSR/hydration drift.
 */
export function formatUnlockDate(lockSeconds: bigint, fromMs: number = Date.now()): string {
  if (lockSeconds <= 0n) return "any time";
  const d = new Date(fromMs + Number(lockSeconds) * 1000);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
