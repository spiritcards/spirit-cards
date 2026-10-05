import { NextResponse } from "next/server";
import type { Hex } from "viem";
import {
  getPublicClient,
  CORE_ADDRESS,
  PROOF_OF_CARD_ABI,
  parseTokenId,
  getCardStats,
  getCollectionStats,
} from "@/lib/poc";
import { renderCardPng } from "@/lib/card-art";
import { statsFromSeed } from "@/lib/seed-traits";
import { RENDER_VERSION } from "@/lib/traits-set";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_W = 32;
const MAX_W = 1024;

/**
 * Card renders are deterministic (seed → trait layers) but expensive: each
 * request does ~2 RPC reads + composes ~21 PNG layers with sharp (~1 s). With no
 * caching, a page full of thumbnails fires a burst of slow invocations — which
 * Vercel's edge treats as abuse and answers with its "Security Checkpoint"
 * (403), so the cards silently 403 and look "unpainted".
 *
 * Two layers of protection:
 *  1. An in-memory LRU per warm lambda (avoids the re-render + re-RPC).
 *  2. Long-lived CDN cache headers so the edge serves repeats without ever
 *     invoking this function (and without re-hitting the RPC).
 */
type Entry = { png: Buffer; at: number };
const CACHE = new Map<string, Entry>();
const CACHE_MAX = 1024;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min (edge TTL is longer)

function cacheGet(key: string): Buffer | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  CACHE.delete(key); // touch → move to the most-recent end (LRU)
  CACHE.set(key, entry);
  return entry.png;
}

function cacheSet(key: string, png: Buffer): void {
  CACHE.set(key, { png, at: Date.now() });
  if (CACHE.size > CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
}

// The render is immutable for a given (id, w), so the edge can hold it forever.
const CACHE_HEADERS: Record<string, string> = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=31536000, immutable, s-maxage=31536000, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
  "Vercel-CDN-Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
};

function pngResponse(png: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(png), { status: 200, headers: CACHE_HEADERS });
}

const ZERO_SEED = /^0x0*$/;

/**
 * Deterministic card PNG for a Spirit Cards token.
 *
 * Composed from the artist's PNG trait layers (public/poc-art) selected by the
 * token's on-chain `seedOf`, with HP/ATK/DEF from `Battle.statsOf`. Pass
 * `?w=<px>` for a grid/thumbnail render (32..1024).
 *
 * The seed is read directly (NOT via `ownerOf`): a card that was burned in
 * battle (`ownerOf` reverts) still has its seed on-chain, so its art keeps
 * rendering — important for the live activity feed. Only a never-minted id
 * (zero seed) 404s.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tokenId = parseTokenId(id);
  if (tokenId === null) {
    return new NextResponse("Invalid token ID", { status: 400 });
  }

  const search = new URL(request.url).searchParams;
  const wRaw = Number.parseInt(search.get("w") ?? "", 10);
  const thumbW = Number.isFinite(wRaw)
    ? Math.min(MAX_W, Math.max(MIN_W, wRaw))
    : null;

  const key = `${RENDER_VERSION}:${tokenId.toString()}:${thumbW ?? 0}`;
  const cached = cacheGet(key);
  if (cached) return pngResponse(cached);

  try {
    const client = getPublicClient();
    const seed = (await client.readContract({
      address: CORE_ADDRESS,
      abi: PROOF_OF_CARD_ABI,
      functionName: "seedOf",
      args: [tokenId],
    })) as Hex;
    if (!seed || ZERO_SEED.test(seed)) {
      return new NextResponse("Token not found", { status: 404 });
    }

    // Stats from the chain; fall back to the seed-derived mirror if the read fails.
    const [stats, collection] = await Promise.all([
      getCardStats(tokenId).catch(() => statsFromSeed(seed)),
      getCollectionStats().catch(() => null),
    ]);

    let png = await renderCardPng({
      seed,
      tokenId,
      stats,
      maxSupply: collection?.maxSupply,
      scale: 2,
    });
    if (thumbW) {
      png = await sharpResize(png, thumbW);
    }
    cacheSet(key, png);
    return pngResponse(png);
  } catch {
    return new NextResponse("Token not found", { status: 404 });
  }
}

async function sharpResize(png: Buffer, w: number): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(png).resize(w, undefined, { fit: "inside", kernel: "lanczos3" }).png().toBuffer();
}
