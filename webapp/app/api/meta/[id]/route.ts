import { NextResponse } from "next/server";
import { parseTokenId, getOnChainToken, getCardStats } from "@/lib/poc";
import { SITE_URL } from "@/lib/site";
import { deriveCard, statsFromSeed, traitAttributes } from "@/lib/seed-traits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

/**
 * OpenSea-compatible metadata for a Spirit Cards token.
 *
 * Traits, rarity and stats are derived deterministically from the immutable
 * on-chain `seedOf`; HP/ATK/DEF are read from `Battle.statsOf` on-chain. The
 * image is the composited card (`/api/image/[id]`).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tokenId = parseTokenId(id);
  if (tokenId === null) {
    return NextResponse.json(
      { error: "Token ID must be an unsigned integer" },
      { status: 400 },
    );
  }

  try {
    const { seed } = await getOnChainToken(tokenId);
    const card = deriveCard(seed, tokenId);
    const stats = await getCardStats(tokenId).catch(() => statsFromSeed(seed));

    return NextResponse.json(
      {
        name: `${card.species.name} #${tokenId} · ${card.rarityTier}`,
        description:
          `Spirit Cards #${tokenId} — a proof-of-work minted ${card.species.element} collectible ` +
          `(${card.species.name}) on Robinhood Chain. Rarity ${card.rarityTier}. ` +
          `HP ${stats.hp} / ATK ${stats.atk} / DEF ${stats.def}. Served by ${SITE_URL}.`,
        image: `${SITE_URL}/api/image/${tokenId}`,
        external_url: `${SITE_URL}/token/${tokenId}`,
        attributes: [
          ...traitAttributes(card),
          { trait_type: "HP", value: stats.hp, display_type: "number" },
          { trait_type: "ATK", value: stats.atk, display_type: "number" },
          { trait_type: "DEF", value: stats.def, display_type: "number" },
          { trait_type: "Seed", value: seed },
        ],
      },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (/revert|owner|exist|minted|not found/i.test(message)) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Unable to load token metadata" },
      { status: 500 },
    );
  }
}
