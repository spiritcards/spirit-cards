import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/recent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Live activity feed: the latest Mined / PackOpened / PackMinted events of the
 * core + Packs contracts. Cached ~20s server-side; safe for client polling.
 */
export async function GET() {
  const events = await getRecentActivity(14);
  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    },
  );
}
