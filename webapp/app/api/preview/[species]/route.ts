import { NextResponse } from "next/server";
import sharp from "sharp";
import { renderSpeciesCard } from "@/lib/card-art";
import { speciesList } from "@/lib/seed-traits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deterministic preview of a single creature design (`/api/preview/<speciesId>`).
 *
 * Backs the collection "overview of all" grid: it renders every species with a
 * fixed species-derived seed, so the full set is visible before/regardless of
 * how many tokens are minted on chain. `?w=<px>` returns a smaller render
 * (32..1024) for grid tiles.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ species: string }> },
) {
  const { species } = await params;
  if (!speciesList.some((s) => s.id === species)) {
    return new NextResponse("Unknown species", { status: 404 });
  }

  const wRaw = Number.parseInt(new URL(request.url).searchParams.get("w") ?? "", 10);
  const thumbW = Number.isFinite(wRaw) ? Math.min(1024, Math.max(32, wRaw)) : null;

  let png = await renderSpeciesCard(species, { scale: 2, maxSupply: 8888n });
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
