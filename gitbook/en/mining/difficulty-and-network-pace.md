# Difficulty & network pace

Mining difficulty is a **fixed base** plus a **gentle era step**. There is deliberately **no
difficulty ratchet** that responds to hash-rate: the game does not try to "outrun" miners.

---

## The difficulty formula

```solidity
// SpiritCards.sol
function requiredBits() public view returns (uint256) {
    uint256 size = config.eraSize();
    uint256 era = size == 0 ? 0 : paidMinted / size;
    return config.baseBits() + (era * config.bitsStepX100()) / 100;
}
```

With the defaults:

| Parameter | Value | Meaning |
|---|---|---|
| `baseBits` | **20** | Starting difficulty (bits) |
| `bitsStepX100` | **33** | +0.33 bit per price-era (hundredths of a bit) |
| `eraSize` | **1111** | Cards per era |

`[proven]`

So difficulty in era `e` is:

```
requiredBits(e) = 20 + floor(e × 33 / 100)
```

### The difficulty ladder

| Era | Cards in era (paid index) | `floor(era × 33 / 100)` | `requiredBits` | Expected hashes |
|---|---|---|---|---|
| 0 | 1 – 1111 | 0 | **20** | ~1.05M |
| 1 | 1112 – 2222 | 0 | **20** | ~1.05M |
| 2 | 2223 – 3333 | 0 | **20** | ~1.05M |
| 3 | 3334 – 4444 | 0 | **20** | ~1.05M |
| 4 | 4445 – 5555 | 1 | **21** | ~2.10M |
| 5 | 5556 – 6666 | 1 | **21** | ~2.10M |
| 6 | 6667 – 7777 | 1 | **21** | ~2.10M |
| 7 | 7778 – 8888 | 2 | **22** | ~4.19M |

`[proven]` for the difficulty values; `[assumed]` for "expected hashes" (it is `2^bits` by definition).

> [!NOTE]
> The step is **fractional** (0.33/era), but the on-chain check uses **whole bits** (`leadingZeroBits`).
> That is why the displayed difficulty only changes every ~3 eras — the fractional step accumulates
> until it crosses a whole-bit boundary.

---

## Why "no ratchet"

Many mining games raise difficulty aggressively in response to hash-rate to "squeeze out" the crowd.
Spirit Cards does the opposite:

- Difficulty is a **schedule** (function of the price-era), not a **feedback loop**.
- Anti-drain is handled by other means: **price rising per era**, **demand**, and the **per-wallet
  cooldown + epoch cap**.
- The intent is that **mining stays worthwhile** throughout the sale, rather than becoming impossible.

`[proven]` for the mechanism; `[assumed]` for the design intent wording.

---

## The pace throttles

Difficulty is only one of three rate controls. The others are time-based:

| Control | Parameter | Default | Effect |
|---|---|---|---|
| Per-wallet cooldown | `mineCooldown` | 45 s | Max ~1 mint per wallet per 45 s |
| Epoch cap | `epochCap` | 1000 | Max 1000 cards per epoch (network-wide) |
| Epoch length | `epochLength` | 3600 s | Epoch = 1 hour |
| Difficulty | `baseBits` | 20 | Hashing effort |

`[proven]`

The epoch cap is the **team's tempo knob**: during a rush it can be raised so the network is not
artificially blocked; during calm it can stay low. The cooldown spreads mints across wallets instead
of letting one fast machine take every slot.

---

## Reading the current state

On-chain you can read: `[proven]`

```solidity
spc.requiredBits()   // current difficulty in bits
spc.currentPrice()   // current mint price (ETH)
spc.paidMinted()     // cards minted at price (drives era)
spc.totalMinted()    // base supply minted so far
config.mineCooldown()
config.epochCap()
config.epochLength()
spc.epochMinted()    // cards minted this epoch
```

`era = paidMinted / eraSize` is the single value that drives **both** price and difficulty.

---

## Retuning

All of these are tunable by the owner (target: the Safe multisig) via `Config`: `[proven]`

- `setMining(baseBits, mineCooldown, epochCap, epochLength)`
- `setBitsStep(bitsStepX100)` (capped at `5000` = +50 bits/era)
- `setPricing(eraPrice, priceStepBps, eraSize)`

Changes are **manual** ("turn the dial"), emitted as `ConfigChanged` events, and take effect
immediately. See [Security & ownership](../project/security-and-ownership.md).

---

## Next

- **[Price & eras](../economy/price-and-eras.md)** — the matching price ladder
- **[Mining overview](README.md)**
