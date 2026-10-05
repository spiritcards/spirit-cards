import { NextResponse } from "next/server";
import sharp from "sharp";
import { keccak256, stringToHex, type Hex } from "viem";
import { renderCardPng } from "@/lib/card-art";
import { statsFromSeed } from "@/lib/seed-traits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sample card renderer — composes a demo card from a synthetic seed, with NO
 * chain read. Used by the collection grid so the art can be inspected before
 * any token is minted. Identical pipeline to /api/image (same layers, same
 * derivation); the only difference is the seed source.
 *
 * `?w=<px>` returns a smaller render (32..1024) for grid tiles.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ n: string }> },
) {
  const { n } = await params;
  const i = Number.parseInt(n, 10);
  if (!Number.isFinite(i) || i < 0 || i > 5_000_000) {
    return new NextResponse("Bad sample index", { status: 400 });
  }
  const wRaw = Number.parseInt(new URL(request.url).searchParams.get("w") ?? "", 10);
  const thumbW = Number.isFinite(wRaw) ? Math.min(1024, Math.max(32, wRaw)) : null;

  const seed = keccak256(stringToHex(`poc-sample:${i}`)) as Hex;
  const tokenId = BigInt(i + 1);
  let png = await renderCardPng({
    seed,
    tokenId,
    stats: statsFromSeed(seed),
    maxSupply: 8888n,
    scale: 2,
  });
  if (thumbW) {
    png = await sharp(png).resize(thumbW, undefined, { fit: "inside", kernel: "lanczos3" }).png().toBuffer();
  }
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
