# Staking & rewards

Staking means **locking a card in the vault** (`StakeVault`) for a chosen period. In return, the card
earns a **weight-based share of the staker pool** — a pool that is funded only by **real fees** the
project collects (the 60% revenue slice, plus the raked share of PvP).

> [!WARNING]
> This is **not** a yield product. There is no APY, no fixed rate, and no guaranteed payout. The pool
> pays whatever it receives; if the project collects little, the pool is small — and it can be zero.

---

## The six tiers

| Tier | Lock | Weight | Weight (×) |
|---|---|---|---|
| 0 | **flexible** (0 days) | `1000` | **1×** |
| 1 | **7 days** | `5000` | **5×** |
| 2 | **30 days** | `10000` | **10×** |
| 3 | **90 days** | `20000` | **20×** |
| 4 | **180 days** | `30000` | **30×** |
| 5 | **365 days** | `40000` | **40×** |

`[proven]` — `tierLock` and `tierWeightX1000` in `Config`.

The weight is the **only** thing that decides your share of the pool. A 365-day stake earns 40× the
dividends of a flexible stake, per card.

- Tiers must be **strictly increasing in lock time** (`setStakingTier` enforces ordering).
- Weight must be **≥ 1×** (`≥ 1000`).
- Flexible (tier 0) has no lock, so you can unstake any time.

---

## How rewards work

The vault uses a classic **reward-per-weight accumulator**:

```
accRewardPerWeight   // scale 1e18; grows whenever rewards are added
weight               // your card's tier weight
rewardDebt           // weight × acc, snapshotted (rounded UP) at stake time

pending = (weight × accRewardPerWeight / 1e18) − rewardDebt
```

When rewards arrive and there is at least one staker, the accumulator increases by
`amount × 1e18 / totalWeight`. Your pending share is the delta above your `rewardDebt`. `[proven]`

Key properties:

- **Pro-rata by weight.** Bigger weight → bigger share, linearly.
- **Upward-rounded debt.** `rewardDebt` is rounded **up** (`_mulDivCeil`) so no staker can claim more
  than their exact share (this closed a 1-wei solvency edge found by invariant fuzzing). `[proven]`
- **Pooled when idle.** If there are **no** stakers, incoming rewards are not lost — they accumulate in
  `undistributed` and are distributed the moment the first staker arrives (to the first staker and
  onward). `[proven]`

---

## Where the pool money comes from

The vault is fed through `notifyRewards()`. Two paths feed it: `[proven]`

1. **Revenue-split pool (60%).** Mint/merge/pack fees route 60% into `SpiritCards.accruedPool`. A
   **permissionless** function `pumpPool()` (callable by anyone — a keeper, the UI, or you) pushes the
   accrued pool into the vault as dividends.
2. **PvP rake share.** Of each duel's rake, **30%** goes to the staker pool (see
   [Lives, stakes & rake](../battle/lives-stakes-and-rake.md)).

```solidity
// SpiritCards.sol
function pumpPool() external nonReentrant {
    uint256 v = accruedPool;
    require(v > 0, "NOTHING");
    require(vault != address(0), "NO_VAULT");
    accruedPool = 0;
    IStakeVault(vault).notifyRewards{value: v}();
    emit PoolPumped(vault, v);
}
```

`pumpPool()` is **safe for anyone to call** — the funds always go to the vault, never to the caller.

---

## A staked card can still fight

This is the part players care about most: **staking does not bench your card.**

- The card is **custodied by the vault**, but the vault authorises the `Battle` module to **lock** a
  staked card into a duel without it ever leaving vault custody. `[proven]`
- The staker **keeps earning** while the card fights (its weight stays in `totalWeight` during the duel).
- **No NFT approval is needed** for a staked card to battle — the vault holds custody. `[proven]`

Mechanically: `Battle._escrow` sees the vault owns the card, calls `vault.lockForBattle(card, staker)`,
and the card is marked `inBattle`. On a win/life-loss, `vault.unlockFromBattle` returns it to the
staked state. See [Battle → Lives, stakes & rake](../battle/lives-stakes-and-rake.md).

---

## What happens if a staked card dies in battle

If a staked card **loses its last life**, `Battle` calls `vault.killInBattle(card)`: `[proven]`

1. The staker's **pending rewards are settled and paid out immediately**.
2. The stake is cleared and its weight removed from `totalWeight`.
3. The card is **burned**.

So even a fatal duel cleanly closes the staking position and pays what it had accrued. `[proven]`

---

## Batches

To save gas on fleets, the vault has batch calls: `[proven]`

| Function | Does |
|---|---|
| `stakeBatch(cardIds, tier)` | Stake many cards in **one** tier, one tx (atomic) |
| `claimBatch(cardIds)` | Claim rewards for many positions, one tx |
| `unstakeBatch(cardIds)` | Unstake many cards, one tx (atomic — reverts if any is still locked or in battle) |

Bat chess: batch ops are **all-or-nothing**. If one card is still locked or busy in a duel,
`unstakeBatch` reverts the whole call, so the UI only sends fully-unlocked sets. `[proven]`

---

## Claiming and unlocking

- `claim(card)` pulls your pending rewards for one staked card.
- `unstake(card)` requires the lock to have elapsed (`now ≥ stakedAt + tierLock`) **and** the card not
  to be `inBattle`; it claims pending rewards and returns the NFT. `[proven]`

> [!NOTE]
> A card in an **open/locked** battle cannot be unstaked until the duel resolves. Since duels resolve
> in the same transaction as `acceptDuel`, this window is short.

---

## Earning points while staked

Staking awards **+2 points** per card staked (and +2 per card in a batch). See
[Points & leaderboard](../gameplay/points-and-leaderboard.md). Points have no monetary value.

---

## Reading it on-chain

```solidity
vault.stakes(cardId)          // user, tier, weight, stakedAt, rewardDebt, active
vault.pending(cardId)         // claimable rewards right now
vault.totalWeight()           // sum of all active weights
vault.accRewardPerWeight()    // accumulator (1e18 scale)
vault.undistributed()         // rewards pooled while no stakers
vault.stakerOf(cardId)        // beneficial owner of a staked card
vault.inBattle(cardId)        // is it locked in a duel?
```

`[proven]`

---

## Honest framing

- **The pool is fee-funded.** More activity → bigger pool; less activity → smaller or empty pool.
- **No floor, no guarantee.** Dividends are a share of *what actually arrived*, nothing more.
- **Points ≠ money.** Points are a game score.
- **Cards can be lost.** A staked card is still at risk if you battle it and it dies.

See the [Legal disclaimer](../project/legal-disclaimer.md).

---

## Next

- **[Merge & forging](merge-and-forging.md)**
- **[Revenue split & referrals](revenue-split-and-referrals.md)**
- **[Battle → Lives, stakes & rake](../battle/lives-stakes-and-rake.md)**
