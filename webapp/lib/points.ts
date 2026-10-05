import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { rhChain, RH_RPC_URL } from "./rh-chain";
import { rpcFetch } from "./rpc";
import { POINTS_ADDRESS, POINTS_ABI, CONFIG_ADDRESS, CONFIG_ABI } from "./poc";

/**
 * points.ts — Spirit Cards activity points.
 *
 * Authoritative per-wallet totals live on-chain in the `Points` contract
 * (`points(address)`). The leaderboard is a best-effort aggregation of the
 * `PointsAdded(user, amount, reason)` log over a rolling window.
 */

export type WalletPoints = {
  address: string;
  points: number;
  /** True when the wallet is a registered AI agent (merged from the registry). */
  agent?: boolean;
  /** Agent display name (registered agents only). */
  name?: string;
};

export type PointsSnapshot = {
  computedAtBlock: number;
  totals: { wallets: number; points: number };
  wallets: WalletPoints[];
};

/** Default point rules (mirror Config.points*; used as a fallback label set). */
export const POINT_RULES: { mine: number; merge: number; stake: number; pvpWin: number } = {
  mine: 1,
  merge: 2,
  stake: 2,
  pvpWin: 3,
};

const POINTS_ADDED = parseAbiItem(
  "event PointsAdded(address indexed user, uint256 amount, bytes32 reason)",
);

const WINDOW_BLOCKS = 250_000n;

const client = createPublicClient({
  chain: rhChain,
  transport: http(RH_RPC_URL, { timeout: 8_000, fetchFn: rpcFetch(2) }),
});

/** Read live point weights from Config (falls back to POINT_RULES). */
export async function readPointRules(): Promise<typeof POINT_RULES> {
  try {
    const [mine, merge, stake, pvpWin] = await Promise.all([
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "pointsMine" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "pointsMerge" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "pointsStake" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "pointsPvpWin" }),
    ]);
    return { mine: Number(mine), merge: Number(merge), stake: Number(stake), pvpWin: Number(pvpWin) };
  } catch {
    return POINT_RULES;
  }
}

/** Authoritative on-chain points balance for one address. */
export async function fetchPointsFor(address: string): Promise<WalletPoints> {
  const lower = address.toLowerCase();
  const points = await client.readContract({
    address: POINTS_ADDRESS,
    abi: POINTS_ABI,
    functionName: "points",
    args: [lower as `0x${string}`],
  });
  return { address: lower, points: Number(points) };
}

/**
 * Best-effort leaderboard: aggregate the `PointsAdded` log over the most recent
 * `WINDOW_BLOCKS` blocks. Totals may under-count activity older than the window
 * — the per-wallet `points(address)` read stays authoritative.
 */
export async function fetchAllPoints(): Promise<PointsSnapshot> {
  const latest = await client.getBlockNumber();
  const from = latest > WINDOW_BLOCKS ? latest - WINDOW_BLOCKS : 0n;

  const logs = await client.getLogs({
    address: POINTS_ADDRESS,
    event: POINTS_ADDED,
    fromBlock: from,
    toBlock: latest,
  });

  const byAddress = new Map<string, number>();
  for (const log of logs) {
    const user = String(log.args.user ?? "").toLowerCase();
    if (!user) continue;
    const amount = Number(log.args.amount ?? 0n);
    byAddress.set(user, (byAddress.get(user) ?? 0) + amount);
  }

  const wallets: WalletPoints[] = [...byAddress.entries()]
    .map(([address, points]) => ({ address, points }))
    .sort((a, b) => b.points - a.points);

  return {
    computedAtBlock: Number(latest),
    totals: {
      wallets: wallets.length,
      points: wallets.reduce((sum, w) => sum + w.points, 0),
    },
    wallets,
  };
}

/** Format a wei-scale value to a plain string (utility re-export). */
export function formatEthValue(value: bigint): string {
  return formatUnits(value, 18);
}
