import { getPublicClient, getCollectionStats, CORE_ADDRESS } from "./poc";
import { PROOF_OF_CARD_ABI } from "./poc-abis";
import { RH_CHAIN_ID } from "./contract";
import { formatUsdc } from "./format";
import { SITE_URL } from "./site";

/**
 * Citable, machine-readable collection statistics for Spirit Cards.
 *
 * Every number is a direct read of the deployed SpiritCards / Config stack via
 * the shared `lib/poc.ts` client. The snapshot is serializable (no bigints) so
 * it is served verbatim as `/stats/current.json` and rendered server-side on
 * `/stats`.
 */

export const STATS_DOMAIN = "spiritcards.fun/stats/1" as const;

export type StatsSnapshot = {
  domain: typeof STATS_DOMAIN;
  updatedAt: string;
  chainId: number;
  contract: string;
  site: string;
  totalMinted: number;
  maxSupply: number;
  currentPriceEth: string;
  baseBits: number;
  mineCooldownSeconds: number;
  mergeFeeEth: string;
  burned: number;
  forged: number;
  paused: boolean;
};

export async function getStatsSnapshot(): Promise<StatsSnapshot> {
  const stats = await getCollectionStats();
  const client = getPublicClient();

  const [burned, forged] = await Promise.all([
    client
      .readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "burned" })
      .catch(() => 0n),
    client
      .readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "forged" })
      .catch(() => 0n),
  ]);

  return {
    domain: STATS_DOMAIN,
    updatedAt: new Date().toISOString(),
    chainId: RH_CHAIN_ID,
    contract: CORE_ADDRESS,
    site: SITE_URL,
    totalMinted: Number(stats.totalMinted),
    maxSupply: Number(stats.maxSupply),
    currentPriceEth: formatUsdc(stats.currentPrice),
    baseBits: stats.baseBits,
    mineCooldownSeconds: Number(stats.mineCooldown),
    mergeFeeEth: formatUsdc(stats.mergeFee),
    burned: Number(burned),
    forged: Number(forged),
    paused: stats.paused,
  };
}
