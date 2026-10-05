# How to mint

There are two ways to produce a card: the **web app** (browser PoW engine) and the **CLI miner**.
Both compute the same work function, so either produces a valid nonce.

---

## Option A — Web app

1. **Connect a wallet** and let the app switch you to Robinhood Chain (`chainId 4663`). `[proven]`
2. Open **Mine**. The in-browser engine searches nonces in the background. `[proven]`
3. When a valid nonce is found, the app sends `mine(nonce, useChip)` on your behalf.
4. Confirm in your wallet. You pay the **current era price**, and (on a full-price mint) receive a card
   plus **1 chip**.

> [!TIP]
> The engine keeps running while you browse other sections, so you usually have a nonce ready by the
> time you want to mint again (subject to the 45 s cooldown).

### Using a chip

Toggle **"use chip"** before minting. If you hold at least one chip:

- The chip is **burned** and you pay **−30%** (`chipDiscountBps = 3000`).
- You do **not** receive a new chip for that mint.

If you toggle "use chip" but hold none, the call reverts with `NO_CHIP`.

---

## Option B — CLI miner

The CLI miner is for farms / power users; it finds valid nonces and prints the arguments to submit.

```
miner/            # PoW engine + hash-rate benchmark
```

Workflow `[proven]`:

1. Run the miner with your address. It searches for a nonce satisfying `requiredBits()`.
2. It outputs the `work` hash — which must match the on-chain `Mined(..., work, ...)` event
   byte-for-byte.
3. Submit `mine(nonce, useChip)` from your wallet (via the app, a script, or a cast/hardhat call).

There is also a **phone-friendly mining page** for benchmarking your device's hash rate.

---

## What it costs

| Component | Amount |
|---|---|
| Mint price | `currentPrice()` — starts `0.00037 ETH`, +25% per era |
| Chip discount | −30% if a chip is used |
| Gas | Network gas, paid in ETH (blocks ~100–250 ms) |

The mint price is **not** a fixed store price — it climbs by era. See
[Price & eras](../economy/price-and-eras.md).

---

## Error codes you may hit

These come straight from the contract requires: `[proven]`

| Revert | Meaning | Fix |
|---|---|---|
| `PAUSED` | Game is paused by the owner | Wait / check status |
| `SOLD_OUT` | `totalMinted + 1 > maxSupply` | Base supply is exhausted |
| `EPOCH_FULL` | Per-epoch cap reached | Wait for the next epoch (up to `epochLength`) |
| `COOLDOWN` | You minted less than `mineCooldown` ago | Wait (default 45 s) |
| `BAD_POW` | Your nonce does not satisfy `requiredBits()` | Re-mine at the current difficulty |
| `NONCE_USED` | That `(you, nonce)` was already used | Use a fresh nonce |
| `NO_CHIP` | You asked for the chip discount but hold no chip | Mine a full-price card first, or don't use a chip |
| `BAD_PAY` | `msg.value` ≠ the required amount | Send exactly `due` |

---

## Points and chips at a glance

```
full-price mint  →  +1 card, +1 chip, +1 point
chip mint        →  +1 card, −1 chip, +1 point   (−30% price)
```

---

## Common mistakes

- **Re-using a nonce.** Once `(you, nonce)` mints, that nonce is permanently consumed. Always mine
  fresh.
- **Mining against stale difficulty.** Difficulty rises by era; a nonce found for the *old*
  `requiredBits()` can fail with `BAD_POW`. Mine at current difficulty.
- **Trusting the preview of traits.** The seed includes `block.prevrandao` of the mint block, so the
  exact traits are only fixed once the transaction is included.
- **Forgetting the cooldown.** 45 s per wallet, no exceptions.

---

## Next

- **[Difficulty & network pace](difficulty-and-network-pace.md)**
- **[Mining overview](README.md)**
- **[Packs](../economy/packs.md)** — the convenience alternative (no PoW)
