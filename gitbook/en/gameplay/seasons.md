# Seasons

Seasons are how Spirit Cards turns a raw on-chain score into a **time-boxed competition**. The
leaderboard itself is on-chain; **season boundaries and ranking are handled off-chain**, using
**snapshots** of the on-chain `Points` totals.

> [!IMPORTANT]
> Seasons are a **game feature**. Any seasonal recognition is **discretionary**, is **not** an
> entitlement, and does **not** change the fact that points have **no monetary value**. Nothing here
> promises a prize.

---

## How seasons work

1. **On-chain score.** Points accrue continuously in the `Points` contract as you mine, merge, stake,
   and win duels. `[proven]`
2. **Off-chain snapshot.** At a season boundary, the team takes a snapshot of `points[address]` values
   (via an indexer or a read of the mapping) for the addresses in play. `[assumed]` — snapshot tooling
   is operational, not in the core contracts.
3. **Season ranking.** Addresses are ranked by their **season delta** — points earned during the season
   — rather than by lifetime total, so newcomers can compete each season. `[assumed]`
4. **Wrap-up.** The season closes, the board is published, and the next season begins. `[assumed]`

Because seasons are a **snapshot + off-chain** process, the exact cadence, rules, and any recognition
are **team decisions** announced per season, not encoded in the contract.

---

## Why off-chain seasons

Putting seasons on-chain (resetting counters, minting season NFTs, etc.) would cost gas and add contract
complexity for something that changes often. Instead:

- The **source of truth** (points per action) stays **on-chain and verifiable**. `[proven]`
- The **framing** (when a season starts/ends, how the board is sliced) is **off-chain and flexible**.
  `[assumed]`

This keeps the contracts simple and lets the team tune seasons without redeploying.

---

## What a season might include

These are **planned / discretionary** and subject to change: `[planned]`

- A **leaderboard** sliced by season window.
- **Recognition** for top players (e.g. on the site / social channels).
- Possible **cosmetic** or **in-game** acknowledgements.
- Possible **themed events** (e.g. a dragon-hunt season).

> [!WARNING]
> Do **not** treat any seasonal mention as a promise of value. Points have no monetary value, and any
> seasonal acknowledgement is discretionary and revocable. No season confers a financial claim.

---

## Fairness notes

Because the on-chain score is **public and auditable**, rankings can be recomputed by anyone with the
same data: `[proven]` for the data; `[assumed]` for the audit process.

- The snapshot uses **on-chain totals**, so it cannot be quietly edited.
- Points are earned through **costly actions** (mining fees, merge fees, staked cards, and the risk of
  losing duels), so the cheapest way to score is also a real spend. `[assumed]`
- Season rules are announced **before** the season where possible. `[planned]`

---

## The bottom line

Seasons are **competition flavor** on top of a transparent on-chain score. They make the game social
and recurring without turning points into money or creating a promise of return.

- Points: on-chain, verifiable, **no monetary value**. `[proven]`
- Season ranking: off-chain snapshot. `[assumed]`
- Recognition: discretionary. `[planned]`

---

## Next

- **[Points & leaderboard](points-and-leaderboard.md)**
- **[Gameplay overview](README.md)**
- **[Legal disclaimer](../project/legal-disclaimer.md)**
