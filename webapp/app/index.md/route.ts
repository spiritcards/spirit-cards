import { SITE_URL } from "@/lib/site";
import { CORE_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/rh-chain";

/**
 * /index.md — markdown version of the collection page (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Spirit Cards — collection overview

> Proof-of-work minted collectible cards on Robinhood Chain (chainId ${RH_CHAIN_ID}, native ETH). Mine a keccak-256 nonce in the browser; a valid nonce is stored on-chain as the card's seedOf. Cards can be merged (2 -> 1), staked for rewards, and battled in PvP duels.

## Key facts

- Core contract: ${CORE_ADDRESS} (SpiritCards, ERC-721, Robinhood Chain)
- Mint: mine(nonce, useChip) payable — msg.value == currentPrice() (discounted with a chip)
- Merge: mergeBurn(a, b) payable — msg.value == Config.mergeFee()
- Stake: StakeVault.stake(tokenId, tier) (approve the vault first)
- Battle: Battle.createDuel / acceptDuel
- Art: deterministic PLACEHOLDER card derived from seedOf (final traits not shipped yet)

## Links

- [Mining guide](${SITE_URL}/mine.md)
- [Collection](${SITE_URL}/collection)
- [Merge](${SITE_URL}/merge)
- [Stake](${SITE_URL}/stake)
- [Battle](${SITE_URL}/battle)
- [Points](${SITE_URL}/points)
- [Full documentation](${SITE_URL}/llms-full.txt)
- [Metadata API example](${SITE_URL}/api/meta/1)
- [Service discovery](${SITE_URL}/.well-known/ai.json)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
