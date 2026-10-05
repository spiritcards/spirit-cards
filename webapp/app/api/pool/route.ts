import { NextResponse } from "next/server";
import {
  getPublicClient,
  CORE_ADDRESS,
  CONFIG_ADDRESS,
  VAULT_ADDRESS,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
  STAKE_VAULT_ABI,
} from "@/lib/poc";

/**
 * /api/pool — read-only "pool / emissions" ops snapshot for Spirit Cards.
 *
 * Reads the live revenue buckets (core), the split/pause config, and the
 * staking vault accounting directly from the contracts. All uint256 values are
 * serialized as decimal strings (bigint → string). Cached 30 s at the edge.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET() {
  try {
    const client = getPublicClient();

    const [
      accruedPool,
      accruedHouse,
      accruedReserve,
      referralOutstanding,
      totalMinted,
      burned,
      forged,
      maxSupply,
      paused,
      poolBps,
      referralBps,
      houseBps,
      reserveBps,
      pvpRakeBps,
      totalWeight,
      undistributed,
      accRewardPerWeight,
    ] = await Promise.all([
      // SpiritCards — revenue buckets + supply counters
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "accruedPool" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "accruedHouse" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "accruedReserve" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "referralOutstanding" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "totalMinted" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "burned" }),
      client.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "forged" }),
      // Config — split / supply / pause
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "maxSupply" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "paused" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "poolBps" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "referralBps" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "houseBps" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "reserveBps" }),
      client.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "pvpRakeBps" }),
      // StakeVault — emissions accounting
      client.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "totalWeight" }),
      client.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "undistributed" }),
      client.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "accRewardPerWeight" }),
    ]);

    return NextResponse.json(
      {
        domain: "spiritcards.fun/pool/1",
        updatedAt: new Date().toISOString(),
        addresses: {
          core: CORE_ADDRESS,
          config: CONFIG_ADDRESS,
          vault: VAULT_ADDRESS,
        },
        revenue: {
          accruedPool: accruedPool.toString(),
          accruedHouse: accruedHouse.toString(),
          accruedReserve: accruedReserve.toString(),
          referralOutstanding: referralOutstanding.toString(),
        },
        supply: {
          totalMinted: totalMinted.toString(),
          burned: burned.toString(),
          forged: forged.toString(),
        },
        config: {
          maxSupply: maxSupply.toString(),
          paused,
          poolBps: poolBps.toString(),
          referralBps: referralBps.toString(),
          houseBps: houseBps.toString(),
          reserveBps: reserveBps.toString(),
          pvpRakeBps: pvpRakeBps.toString(),
        },
        staking: {
          totalWeight: totalWeight.toString(),
          undistributed: undistributed.toString(),
          accRewardPerWeight: accRewardPerWeight.toString(),
        },
      },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error) {
    console.error("[api/pool] snapshot failed:", error);
    return NextResponse.json(
      { error: "Unable to load pool snapshot" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
