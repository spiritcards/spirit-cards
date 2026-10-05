import { NextResponse } from "next/server";
import { getBattleActivity } from "@/lib/battle-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live battle feed: the latest DuelCreated / DuelResolved / DuelCancelled events
 * of the Battle contract. Cached ~20s server-side; safe for client polling.
 */
export async function GET() {
  const events = await getBattleActivity(12);
  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    },
  );
}
