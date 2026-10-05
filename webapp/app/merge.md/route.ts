import { SITE_URL } from "@/lib/site";
import { CONFIG_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/rh-chain";

/**
 * /merge.md — markdown version of the merge page (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards — merge

> Merging is the reroll: burn two owned cards into one child of a higher tier (mergeBurn) — a deflationary evolution on Robinhood Chain (chainId ${RH_CHAIN_ID}). Supply shrinks and junk that nobody would buy at mint price becomes a chance at rarity.

## How it works

1. Pick two of your cards (neither may be staked).
2. Pay the merge fee.
3. Both parents burn and one child is forged in the same, atomic transaction.

- Call: mergeBurn(uint256 a, uint256 b) payable — msg.value must equal Config.mergeFee() (default 0.00002 ETH).
- The child's seed is decided after inclusion (a new on-chain seed), so a winning pair cannot be pre-computed.
- base = max(rankA, rankB); the child is a weighted pick that can stay the same or, rarely, drop.
- Event: Merged(a, b, child, fee).

## Dud chance (anti-arbitrage)

- mergeFailBps = 700 → a 7% chance the merge comes up empty (dud): both cards burn and no new card appears. This closes the "2×N is always worth less than N+1" loop; set mergeFailBps = 0 to disable it.

## Invariants

- You cannot merge a card with itself, a card you do not own, or a card that is staked.

## Referral formula

- An invite is a share of the invitee's activity, not of a deposit. From the 10% referral fund, 3% of the gross payment goes to the master referrer (a fixed top-level referrer for every payer) and 7% goes to the payer's own referrer; with no referrer the 7% stays in the undistributed fund.

## Related

- Config: ${CONFIG_ADDRESS}
- [Collection](${SITE_URL}/collection.md) · [Stake](${SITE_URL}/stake.md) · [Battle](${SITE_URL}/battle.md) · [Full documentation](${SITE_URL}/llms-full.txt)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
