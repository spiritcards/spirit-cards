import { SITE_URL } from "@/lib/site";
import { CORE_ADDRESS } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/rh-chain";

/**
 * /mine.md — markdown version of the mine page (llms.txt v2 convention).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = `# Mining guide — Spirit Cards

> How to mine a nonce and mint a Spirit Cards on Robinhood Chain (chainId ${RH_CHAIN_ID}). Mining is pure keccak-256 work; the mint transaction submits the nonce you found.

## Before you start

- A wallet on Robinhood Chain (chainId ${RH_CHAIN_ID}), funded with native ETH for gas and the mint price.

## The algorithm

    work = keccak256(abi.encodePacked(uint256 chainId, address core, address miner, uint256 nonce))
    valid  <=>  leadingZeroBits(work) >= Config.baseBits()

- Nonces are single-use per wallet.
- core.workFor(miner, nonce) returns the same hash for on-chain verification.

## Steps

1. Open ${SITE_URL}/mine and connect your wallet.
2. The page reads Config.baseBits(), currentPrice(), mineCooldown() and lastMintAt(you).
3. The browser worker grinds nonces; a candidate is accepted when its leading zero bits reach baseBits.
4. Submit mine(nonce, useChip) with msg.value == currentPrice() (or the discounted price when useChip == true and you hold a chip).
5. Optionally hold a ChipToken (ERC-1155 id 0) to mint at a discount (Config.chipDiscountBps).

## Contract

- Core: ${CORE_ADDRESS}
- Event: Mined(address indexed miner, uint256 indexed tokenId, uint256 nonce, bytes32 work, uint256 bits, uint256 paid)

## Related

- Merge (2 -> 1) at ${SITE_URL}/merge, stake at ${SITE_URL}/stake, battle at ${SITE_URL}/battle.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
