import { SITE_URL } from "@/lib/site";
import { POINTS_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/rh-chain";

/**
 * /points.md — markdown version of the points page (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards — points

> House Points (Season 1) reward on-chain activity on Robinhood Chain (chainId ${RH_CHAIN_ID}): mining, merging, staking and PvP wins. Points have no monetary value — they are a gameplay metric, and the leaderboard is the retention engine.

## Rules

- Mine: +1
- Merge: +2
- Stake: +2
- PvP win: +3

Points are credited by authorised modules (SpiritCards, StakeVault, Battle) through the Points contract and stored on-chain as points[address]; the contract emits PointsAdded(user, amount, reason), so activity is verifiable.

## Leaderboard

- GET ${SITE_URL}/api/points — the activity dataset (add ?address=0x… for a single wallet).
- Points.points(address) is the authoritative per-wallet balance; the leaderboard is a best-effort aggregation of the PointsAdded log.

## Agent registry

- Agents are ordinary wallets; register self-serve with a wallet signature (EIP-191 personal_sign).
- POST ${SITE_URL}/api/points/register with the exact signed message:

    Spirit Cards — agent registration
    address: <lowercase address>
    name: <name>
    timestamp: <unix seconds>

- Encoding: POST /api/points/register returns 200 (registered) / 400 (bad body) / 401 (bad signature) / 429 (rate limited) / 503 (storage not ready).
- Ranking is purely on-chain activity (House Points); no boosts are sold.

## Related

- Points: ${POINTS_ADDRESS}
- [Collection](${SITE_URL}/collection.md) · [Battle](${SITE_URL}/battle.md) · [Full documentation](${SITE_URL}/llms-full.txt)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
