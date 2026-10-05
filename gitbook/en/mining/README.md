# Mining (挖 MINE)

Mining is how a Spirit Card enters the world. It is a **real proof-of-work**: your machine searches
for a number that makes a hash have enough leading zero bits. When it finds one, you send that number
to the contract, the contract verifies the work, and you receive a card.

> Mining does **not** use a difficulty ratchet that "squeezes out the crowd." Difficulty is fixed and
> rises only gently with the price-era (about **+1 bit every ~3 eras**). Anti-drain is handled by
> price, demand, and a per-wallet cooldown — not by punishing miners. `[proven]`

---

## The mining equation

```
work = keccak256(abi.encodePacked(chainId, address(core), miner, nonce))

valid  ⇔  leadingZeroBits(work) ≥ requiredBits()
```

- `chainId` — `4663` (prevents cross-chain replay).
- `address(core)` — the `SpiritCards` contract address.
- `miner` — your wallet address.
- `nonce` — the number you search for; **one-time use per (miner, nonce)**.
- `requiredBits()` — the current difficulty in whole bits.

`[proven]` — this is exactly the check in `SpiritCards.mine()`.

At difficulty **20 bits**, the expected number of hashes to find a valid nonce is `2²⁰ ≈ 1,048,576`.
That is seconds, not hours. `[proven]`

---

## What mining gives you

For each successful `mine()`:

1. A new **card** with a fresh on-chain seed.
2. **1 chip** — *if* you paid full price (chips are granted only on full-price mints; see below).
3. **+1 activity point**.

Mining also charges the **current era price** in ETH. That price funds the revenue split (pool /
referral / treasury) covered in the [Economy section](../economy/README.md).

---

## The three throttles

To keep the mint rate sane without a difficulty ratchet, mining is bounded by three tunable knobs:

| Throttle | Parameter | Default | Meaning |
|---|---|---|---|
| Per-wallet cooldown | `mineCooldown` | **45 s** | You cannot mine again for 45 s from the last mint |
| Per-epoch cap | `epochCap` / `epochLength` | **1000** per **3600 s** | At most 1000 cards minted per one-hour epoch (network-wide) |
| Fixed difficulty | `baseBits` (+ era step) | **20** | How many leading zero bits are required |

`[proven]`

The epoch cap is a **pace throttle** the team can raise during a rush; the cooldown is a
**fairness throttle** that spreads mints across wallets rather than letting one bot hoover the block.

---

## Chips (spark accelerators)

A chip is an **ERC-1155** consumable (id `0`, symbol `CHIP`) that gives a **−30% discount** on a mint.

The rule that matters:

> **A FULL-price mint grants 1 chip. A chip-discounted mint only consumes one — it does not grant one.**

This asymmetry is deliberate: if discounted mints also granted chips, the discount would renew itself
forever. As written, a chip is a **one-shot -30% coupon** you earn by paying full price once.

`[proven]`

Worked chain:

| Mint # | You pay | Chip balance after |
|---|---|---|
| 1 | full price | +1 chip |
| 2 (use chip) | −30% | −1 chip → 0 |
| 3 | full price | +1 chip |
| 4 (use chip) | −30% | 0 |
| … | … | … |

See [How to mint](how-to-mint.md) for the exact call.

---

## Why "proof of work" and not "proof of payment"

The design intent is that a card **costs effort**, not just money: the nonce search is what mints it.
Packs exist as a convenience (they bypass PoW) but the canonical acquisition path is work. The
on-chain event `Mined(miner, tokenId, nonce, work, bits, paid)` records both the payer and the
difficulty actually satisfied, so the work is auditable.

`[proven]`

---

## Pages in this section

- **[Proof-of-work mining](proof-of-work-mining.md)** — the full equation, nonce, seed, verification
- **[How to mint](how-to-mint.md)** — app + CLI, chips, gas, errors
- **[Difficulty & network pace](difficulty-and-network-pace.md)** — `requiredBits`, eras, throttle tuning

> [!WARNING]
> Mining costs real ETH and yields a game item with no guaranteed value. There is no "payback" and no
> promised yield. See the [Legal disclaimer](../project/legal-disclaimer.md).
