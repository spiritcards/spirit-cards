# Packs (拆卡)

Packs are a **convenience** way to acquire several cards in one transaction. A pack **bypasses
proof-of-work** (the contract mints straight to you) and **bypasses the per-epoch cap and cooldown** —
so the per-card price is a **premium: ×2 the current mint price** (`packPriceBps = 20000`), reduced by
a **volume discount** that grows with pack size. Revenue still routes through the same split as a
manual mint.

> [!NOTE]
> Buying a pack is the "I want N cards now" path. Mining is the canonical path where cards are earned
> by work. Packs do not replace mining; they are an alternative for convenience.

---

## Sizes and discounts

| Index | Size (cards) | Discount (`discountBps`) |
|---|---|---|
| 0 | **5** | 3% (`300`) |
| 1 | **10** | 6% (`600`) |
| 2 | **25** | 12% (`1200`) |
| 3 | **50** | 20% (`2000`) |
| 4 | **100** | 30% (`3000`) |

`[proven]`

The per-card pack price is `currentPrice() × packPriceBps/10000` (default **×2** — buying skips the
PoW work), and the volume discount applies to the whole pack:

```solidity
function priceFor(uint256 i) public view returns (uint256) {
    uint256 unit = (spc.currentPrice() * config.packPriceBps()) / 10000; // default ×2
    uint256 base = unit * size[i];
    return base - (base * discountBps[i]) / 10000;
}
```

---

## Pack prices at era 0

At the starting era price of `0.00037 ETH` (≈$1 per minted card), pack cards cost ×2 − volume
discount (USD at ETH ≈ $2700):

| Pack | Cards | Price (ETH) | ≈ USD | Per-card (USD) | vs mint price |
|---|---|---|---|---|---|
| 5 | 5 | `0.003589` | ~$9.7 | $1.94 | ×1.94 |
| 10 | 10 | `0.006956` | ~$18.8 | $1.88 | ×1.88 |
| 25 | 25 | `0.016280` | ~$44.0 | $1.76 | ×1.76 |
| 50 | 50 | `0.029600` | ~$79.9 | $1.60 | ×1.60 |
| 100 | 100 | `0.051800` | ~$139.9 | $1.40 | ×1.40 |

`[proven]` for the formula; `[assumed]` for USD (ETH-price dependent). As the era rises, pack prices
scale with `currentPrice()` automatically; the ×2 multiplier is a Config knob (`setPackPriceBps`,
floor ≥ ×1) and the discount percentages are fixed per size.

---

## What a pack gives you

`buyPack(i)` does: `[proven]`

1. Charges `priceFor(i)` in ETH.
2. Calls `SpiritCards.mintPack(msg.sender, size[i])`, which mints `size[i]` cards whose seeds are
   `keccak256(block.prevrandao, buyer, id, index)`.
3. Routes the ETH through `collectRevenue`, applying the standard **pool 60 / referral 10 / treasury 30**
   split.
4. Increments your `packsBought` and `pity` counters.
5. Emits `PackOpened(buyer, size, firstId, paid, discountBps)`.

Because it uses `mintPack`, packs **do not** check `requiredBits()`, the cooldown, or the epoch cap.
They **do** respect `maxSupply` and the pause switch. `[proven]`

> [!NOTE]
> Pack card seeds do **not** include a per-card nonce the way mined cards do; instead each of the N
> cards uses its own `index` in the seed hash. Every card still gets a unique, on-chain seed.

---

## Pity counter (advisory)

`Packs` keeps a per-address `pity` counter that increments with each pack purchase and can be reset by
the owner (`resetPity`). It is **advisory**: because the actual rarity of each card is derived
**off-chain from the on-chain seed**, the contract cannot itself "see" rareness and auto-trigger a
guaranteed payout. The counter is a hook for the UI/dashboard to surface a "guarantee" experience.

`[proven]` for the counter existing; `[assumed]` for any specific off-chain guarantee policy.

---

## Public odds

Rarity, element, and skill are **uniform draws from the card's seed bytes**: `[proven]`

| Trait | Space | Odds per draw |
|---|---|---|
| Rarity | 6 tiers | ~1/6 each `[assumed]` |
| Element | 4 elements | ~1/4 each `[assumed]` |
| Skill | 6 skills | ~1/6 each `[assumed]` |

Because traits are seed-derived (not weighted by a "drop table"), **every pack size has the same
per-card odds**. Buying a bigger pack does not improve your odds per card — it only gets you more cards
and a bigger discount. The odds are **public** and constant. `[proven]` for the seed derivation;
`[assumed]` for "≈ uniform" as a large-sample statement.

---

## Compliance notes

Per the project's China-market guardrails: `[assumed — policy, not code]`

- **No under-18** participation.
- **Odds are disclosed** (as above).
- **No lottery-like value dispersion** — packs give game items, not cash prizes.
- **No investment language** — packs are a purchase, not a yield product.

See the [Legal disclaimer](../project/legal-disclaimer.md).

---

## Reading it on-chain

```solidity
packs.priceFor(i)        // price of pack i
packs.size(i)            // cards in pack i
packs.discountBps(i)     // discount of pack i
config.packPriceBps()    // ×2 multiplier (20000 bps) — setPackPriceBps()
spc.mintPack(to, count)  // only callable by the Packs contract
```

`[proven]`

---

## Next

- **[Staking & rewards](staking-and-rewards.md)**
- **[Merge & forging](merge-and-forging.md)**
- **[Revenue split & referrals](revenue-split-and-referrals.md)**
