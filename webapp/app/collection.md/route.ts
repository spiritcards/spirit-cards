import { SITE_URL } from "@/lib/site";
import { CORE_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/rh-chain";

/**
 * /collection.md — markdown version of the collection page (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards — collection

> The live collection grid on Robinhood Chain (chainId ${RH_CHAIN_ID}): one tile per minted card, filtered by element and grid density. A card is not an abstract token but an elemental creature — its species, art, element and stats all derive deterministically from its on-chain seed.

## Registry (Season 1)

- 16 creature designs — 8 universal beasts (Emberback · Ripplefin · Mossroot · Cloudwhisk · Flashbound · Frostpuff · Quicksilver · Moonglimmer) and 8 dragons (Cindermaw · Tidecoil · Rootwaker · Zephyrcrest · Voltrush · Frostmane · Silvervein · Starwisp).
- 6 rarity tiers: Common, Rare, Super Rare, Ultra Rare, Secret Rare and Prism (1-of-1). Rarity is read from the top bits of the seed and scales base HP / ATK / DEF.
- Supply is finite: at most 8888 cards (maxSupply); minting and burns only ever reduce what is left.

## Elements

- The grid filters by the eight "Elements of Life" accents: Magma, Tide, Moss, Storm, Spark, Ice, Metal, Celestial.
- Four of them form the battle cycle (Ember › Stone › Gale › Tide › Ember).

## How to read a card

- seed = seedOf(tokenId); keccak-256 derives the species, one value per trait group and the rarity tier.
- Base stats hp / atk / def scale with the rarity tier; the same seed always yields the same creature in the app, its metadata and the explorer.

## API

- Metadata: ${SITE_URL}/api/meta/{id}
- Deterministic PNG: ${SITE_URL}/api/image/{id} (add ?w=<px> for a thumbnail, ?master=1 for the 3072×3072 master)
- Contract: ${CORE_ADDRESS}

## Related

- [Mining guide](${SITE_URL}/mine.md) · [Merge](${SITE_URL}/merge.md) · [Stake](${SITE_URL}/stake.md) · [Battle](${SITE_URL}/battle.md) · [Points](${SITE_URL}/points.md)
- [Full documentation](${SITE_URL}/llms-full.txt)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
