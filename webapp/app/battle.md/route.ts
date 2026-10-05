import { SITE_URL } from "@/lib/site";
import { BATTLE_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/rh-chain";

/**
 * /battle.md — markdown version of the battle page (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards — battle

> Battle v2 is a staked duel-escrow on Robinhood Chain (chainId ${RH_CHAIN_ID}): two players each commit one card and an equal stake in ETH; the winner takes the pot minus a rake and the loser loses one of the card's three lives. The fight resolves deterministically on-chain, but the outcome is gambling — not simply "the stronger card always wins".

## Calls

- createDuel(uint256 cardA, uint256 stake) payable -> id — commit a card and a stake to escrow.
- acceptDuel(uint256 id, uint256 cardB) payable — match the stake; the fight resolves in that same transaction.
- cancelDuel(uint256 id) — return your card and stake from your own open duel.
- You cannot accept your own duel. The pot is stake × 2.
- Reads: duels(uint256) -> (a, cardA, stake, open); duelCount(); wins(card), losses(card), lives(card).

## Elements (type advantage)

- Cycle: Ember › Stone › Gale › Tide › Ember. The winning element deals +20% damage; the losing one deals −20% (typeAdvBps = 2000).

## Skills (seed-derived)

- skill = (seed >> 208) % 6 — the player does not control it.
- 0 None · 1 Crit (20% chance of ×2) · 2 Shield (incoming −30%) · 3 Pierce (ignores DEF) · 4 Precision (+15% always) · 5 Vigor (+20% max HP).

## Variance and lives

- Every attack is multiplied by a random factor in ±40% (atkVarianceBps = 4000). With the ±20% element and skill effects, roughly equal cards are close to a coin flip.
- Each card has 3 lives: the loser loses one and a card at 0 lives burns (a real supply sink); the winner gains +1 on its win counter.
- The exact outcome also depends on the executing block's prevrandao, so a fight can be replayed off-chain from the card seeds, the stake and prevrandao.

## Rake

- 10% of the pot (pvpRakeBps = 1000). It is external revenue (not from mints), so duels feed the dividend pool.
- Split: 70% treasury (team), 30% staker pool (rakeToPoolBps = 3000).

## Related

- Battle: ${BATTLE_ADDRESS}
- [Stake](${SITE_URL}/stake.md) · [Collection](${SITE_URL}/collection.md) · [Points](${SITE_URL}/points.md) · [Full documentation](${SITE_URL}/llms-full.txt)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
