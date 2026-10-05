import { NextResponse } from "next/server";
import { fetchAllPoints, fetchPointsFor, readPointRules, type WalletPoints } from "@/lib/points";
import { readAgentRegistry, type AgentRecord } from "@/lib/agents";

/**
 * /api/points — Spirit Cards activity points dataset.
 *
 * Per-wallet totals are authoritative on-chain (`Points.points(address)`);
 * the leaderboard is a best-effort aggregation of the PointsAdded log.
 * Add ?address=0x… for a single wallet. Cached 60s at the edge.
 *
 * The agent registry (see lib/agents.ts) is merged into both responses as
 * `agents`; in the leaderboard a registered address with no activity is listed
 * with zero points. Ranking stays purely on-chain — registry entries only
 * annotate / append, they never boost a wallet.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

/** Registry read that never fails the request: unavailable => empty list. */
async function loadAgents(): Promise<AgentRecord[]> {
  const [result] = await Promise.allSettled([readAgentRegistry()]);
  return result.status === "fulfilled" ? result.value : [];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get("address");

    if (address) {
      const [wallet, rules, agents] = await Promise.all([
        fetchPointsFor(address),
        readPointRules(),
        loadAgents(),
      ]);
      return NextResponse.json(
        {
          domain: "spiritcards.fun/points/1",
          rules,
          address: address.toLowerCase(),
          wallet,
          agents,
          updatedAt: new Date().toISOString(),
        },
        { headers: { "Cache-Control": CACHE_CONTROL } },
      );
    }

    const [snapshot, rules, agents] = await Promise.all([
      fetchAllPoints(),
      readPointRules(),
      loadAgents(),
    ]);

    // Merge the registry into the on-chain leaderboard. Registered addresses
    // that already have activity are annotated in place; registered addresses
    // with no activity are appended with zero points (they trail the ranking,
    // which stays on-chain).
    const wallets: WalletPoints[] = snapshot.wallets.slice(0, 200).map((w) => ({ ...w }));
    const byAddress = new Map(wallets.map((w) => [w.address.toLowerCase(), w]));
    for (const agent of agents) {
      const addr = agent.address.toLowerCase();
      const existing = byAddress.get(addr);
      if (existing) {
        existing.agent = true;
        existing.name = agent.name;
      } else {
        const entry: WalletPoints = { address: addr, points: 0, agent: true, name: agent.name };
        wallets.push(entry);
        byAddress.set(addr, entry);
      }
    }

    return NextResponse.json(
      {
        domain: "spiritcards.fun/points/1",
        rules,
        updatedAt: new Date().toISOString(),
        computedAtBlock: snapshot.computedAtBlock,
        totals: snapshot.totals,
        wallets,
        agents,
      },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error) {
    console.error("[api/points] snapshot failed:", error);
    return NextResponse.json(
      { error: "Unable to load points snapshot" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
