import { SITE_URL } from "@/lib/site";
import { VAULT_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/rh-chain";

/**
 * /stake.md — markdown version of the stake page (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards — stake

> Staking is the card bank: lock a card in the StakeVault (Robinhood Chain, chainId ${RH_CHAIN_ID}) for a chosen term and earn a share of the pool — a portion of the real fees the game actually collects. Longer locks carry more weight and therefore a bigger share.

## Tiers (6)

- t0 — flexible (0 days) — weight 1000 — ×1
- t1 — 7 days — weight 5000 — ×5
- t2 — 30 days — weight 10000 — ×10
- t3 — 90 days — weight 20000 — ×20
- t4 — 180 days — weight 30000 — ×30
- t5 — 365 days — weight 40000 — ×40

- t0 is flexible (withdraw any time); t1–t5 are hard locks with no early exit.
- Weight sets what fraction of the pool a card receives relative to every other staked card.

## Calls

- Approve the vault first: core.setApprovalForAll(vault, true).
- stake(uint256 tokenId, uint256 tier); unstake(uint256 tokenId); claim(uint256 tokenId); pending(uint256 tokenId).
- Reads: stakes(uint256) -> (user, tier, weight, stakedAt, rewardDebt, active); totalWeight().
- Batch: stakeBatch / claimBatch / unstakeBatch move many cards in one transaction.

## Dividends

- The pool is filled by project fees (60% of mint, 60% of merge, 60% of pack revenue) and external duel rake (30%), then distributed by weight inside the vault (accRewardPerWeight).
- A permissionless pumpPool() moves the accruedPool into the StakeVault as dividends — anyone can call it, and the funds always go to the vault, never to the caller.
- Claim at any time without unstaking.

## Battle with a staked card

- A staked card can still fight: it never leaves the vault — it is only locked for the duel (lockForBattle), dividends keep accruing, and no NFT approval is needed.
- If it loses its last life in battle, the vault itself burns it and settles any unclaimed rewards to the staker.

## Related

- Vault: ${VAULT_ADDRESS}
- [Collection](${SITE_URL}/collection.md) · [Merge](${SITE_URL}/merge.md) · [Battle](${SITE_URL}/battle.md) · [Points](${SITE_URL}/points.md) · [Full documentation](${SITE_URL}/llms-full.txt)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
