# Economy

Spirit Cards has **no token**. Value moves in ETH, and the "economy" is a set of real fee flows:
mint fees, merge fees, pack purchases, and a PvP rake. A share of those fees is routed to a staker
pool; the rest goes to the treasury. Everything is priced and split by the `Config` contract.

> [!WARNING]
> None of the reward mechanics here promise a return. The staker pool pays **only a share of the fees
> the project actually collects**, and that share can be small or zero. There is **no APY**, no
> guaranteed yield, and no "payback period." Points have **no monetary value**. Spirit Cards is a game.

---

## Money in, money out

**Sources (ETH in):**

- Mint price per mined card.
- Merge fee per merge.
- Pack purchases (bundles).
- PvP duel rake.
- Royalty (5%) on secondary sales.
- `[planned]` future sponsorships / external revenue.

**Sinks (ETH out / removed):**

- Staker dividends (share of the pool).
- Treasury (team + marketing).
- Referral payouts.
- Burn (cards destroyed by merge / battle → supply sink).

`[proven]` — the fee routers and splits are all in the contracts.

---

## The three-way split

Every fee (mint, merge, pack) is split identically: `[proven]`

| Bucket | Share | Parameter |
|---|---|---|
| **Staker pool** | 60% | `poolBps = 6000` |
| **Referral fund** | 10% | `referralBps = 1000` |
| **Treasury** | 30% | `houseBps = 3000` |
| **Reserve** | 0% | `reserveBps = 0` |

The split is tunable (must sum to 10000 bps). Details, plus the referral mechanics, are in
[Revenue split & referrals](revenue-split-and-referrals.md).

---

## The pages in this section

| Page | Covers |
|---|---|
| **[Price & eras](price-and-eras.md)** | The `0.00037 ETH` start, +25%/era, the 8-era ladder, total, difficulty coupling |
| **[Packs](packs.md)** | Sizes 5/10/25/50/100, discounts, pity, public odds |
| **[Staking & rewards](staking-and-rewards.md)** | 6 tiers, weights, the reward accumulator, batches, fighting while staked |
| **[Merge & forging](merge-and-forging.md)** | 2 → 1 evolution, fee, the 7% "dud" |
| **[Revenue split & referrals](revenue-split-and-referrals.md)** | pool/ref/treasury, master ref 3% + referrer 7%, royalty |

---

## Design principles

1. **Real fees only.** Dividends come from actual inflows, never from a promise or an emissions
   schedule. If no one plays, the pool does not grow.
2. **Zero-sum battles.** A duel transfers stake between players plus a rake; it does not create money
   from nothing. So the PvP layer is **not** a Ponzi — it is a game with a house edge that feeds the
   pool and treasury. `[proven]`
3. **Deflationary pressure.** Merging burns two cards and battles can burn cards at 0 lives, reducing
   live supply over time. `[proven]`
4. **Tunable, transparent.** Every number is in `Config`, changeable by the owner (target: Safe
   multisig), and every change emits an event. `[proven]`

---

## A note on framing

The staker pool can be described as **"a share of the real fees the project earns."** It must **not**
be framed as a yield, an APY, an investment, or a break-even product. There is no floor: dividends are
whatever the pool receives, split by staking weight.

- Points → no monetary value.
- Pool → variable, fee-funded, can be zero.
- Cards → game items; value can fall to zero.

See the [Legal disclaimer](../project/legal-disclaimer.md).
