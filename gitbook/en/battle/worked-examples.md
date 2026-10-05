# Worked examples

This page fights two specific cards, **round by round**, using the exact arithmetic of
[Resolution & damage](resolution-and-damage.md). The seed values are illustrative, but every step is
computed the way the contract computes it (integer math, floor division).

---

## The two contenders

| | **Cinder Drake** (Card A) | **Tide Golem** (Card B) |
|---|---|---|
| Rarity | SR (2) | SR (2) |
| Element | **Ember** (0) | **Tide** (3) |
| Skill | **Precision** (4) | **Shield** (2) |
| HP | **120** | **140** |
| ATK | **24** | **18** |
| DEF | **10** | **16** |

### How these stats come from the seed

Using the formulas from `Battle.statsOf` (rarity 2 → +8 ATK, +6 DEF, +30 HP):

| Field | Card A bytes | Computed | Card B bytes | Computed |
|---|---|---|---|---|
| rarity `>> 248` | `…%6 = 2` | SR | `…%6 = 2` | SR |
| atk byte `%20` | `8` | `8 + 8 + 2·4 = 24` | `2` | `8 + 2 + 2·4 = 18` |
| def byte `%16` | `0` | `4 + 0 + 2·3 = 10` | `6` | `4 + 6 + 2·3 = 16` |
| hp byte `%100` | `40` | `50 + 40 + 2·15 = 120` | `60` | `50 + 60 + 2·15 = 140` |
| element bits | `0` | **Ember** | `3` | **Tide** |
| skill byte `%6` | `4` | **Precision** | `2` | **Shield** |

`[assumed]` — the byte values are illustrative; the derivation is `[proven]`.

---

## Step A1 — elements

The cycle is **Ember → Stone → Gale → Tide → Ember**. Tide **beats** Ember. So:

- A (Ember) multiplier = **0.80** (disadvantage)
- B (Tide) multiplier = **1.20** (advantage)

`[proven]`

---

## Step A2 — RNG and per-battle variance

The resolver seeds from `prevrandao` and rolls each side's attack **once**. For this example, suppose
the roll gives:

- A variance factor = **1.10**
- B variance factor = **0.95**

(Any value in [0.60, 1.40] is possible; here we pick a modestly favorable roll for A and an unfavorable
one for B, then show the fight.)

---

## Step A3 — effective attack and per-strike damage

### Card A attacks (Precision, ×0.80 element, ×1.10 variance)

```
scaled  = floor(24 × 1.10)          = floor(26.4)     = 26
effAtk  = floor(26 × 0.80)          = floor(20.8)     = 20
DEF'    = 16  (B has no Pierce)     → floor(16/2) = 8
base    = max(1, 20 − 8)            = 12
Precision (A): floor(12 × 1.15)     = floor(13.8)    = 13
Crit: A is not Crit → skip
Shield (B is defender): floor(13 × 0.70) = floor(9.1) = 9
```

> **Card A deals 9 damage per strike.**

### Card B attacks (Shield, ×1.20 element, ×0.95 variance)

```
scaled  = floor(18 × 0.95)          = floor(17.1)     = 17
effAtk  = floor(17 × 1.20)          = floor(20.4)     = 20
DEF'    = 10  (A has no Pierce)     → floor(10/2) = 5
base    = max(1, 20 − 5)            = 15
Precision: B is not Precision → skip
Crit: B is not Crit → skip
Shield (A is defender, A is Precision, no shield) → skip
```

> **Card B deals 15 damage per strike.**

Neither card has Crit, so **both per-strike damages are constant** for the whole fight. This makes the
duel a simple race: A needs `ceil(140/9) = 16` strikes; B needs `ceil(120/15) = 8` strikes.

---

## Step A4 — the round-by-round fight

**A strikes on even rounds (0, 2, 4, …); B on odd rounds (1, 3, 5, …).**

| Round | Who strikes | Damage | A HP | B HP |
|---|---|---|---|---|
| start | — | — | 120 | 140 |
| 0 | **A** | 9 | 120 | 131 |
| 1 | **B** | 15 | 105 | 131 |
| 2 | **A** | 9 | 105 | 122 |
| 3 | **B** | 15 | 90 | 122 |
| 4 | **A** | 9 | 90 | 113 |
| 5 | **B** | 15 | 75 | 113 |
| 6 | **A** | 9 | 75 | 104 |
| 7 | **B** | 15 | 60 | 104 |
| 8 | **A** | 9 | 60 | 95 |
| 9 | **B** | 15 | 45 | 95 |
| 10 | **A** | 9 | 45 | 86 |
| 11 | **B** | 15 | 30 | 86 |
| 12 | **A** | 9 | 30 | 77 |
| 13 | **B** | 15 | 15 | 77 |
| 14 | **A** | 9 | 15 | 68 |
| **15** | **B** | **15** | **0** | 68 |

**Card B (Tide Golem) wins on round 15.** A reached 0 HP first. B took the first hit but had the better
element multiplier, a flat −30% Shield, and more HP — enough to win the race comfortably.

**Result:** `aWins = false` → B wins the pot; A loses 1 life.

> [!NOTE]
> The fight ended at round 15, well within the 64-round cap, so no fraction tiebreak was needed.

---

## Step A5 — the settlement (stake = 0.01 ETH)

| Item | Value |
|---|---|
| Pot | 0.020000 ETH |
| Rake (10%) | 0.002000 ETH |
| → Treasury (70% of rake) | 0.001400 ETH |
| → Staker pool (30% of rake) | 0.000600 ETH |
| **B's payout** | **0.018000 ETH** |
| A's life | 3 → **2** |
| A's card | returned to A (still alive) |
| B's card | returned to B, `wins[B] += 1` |
| A's card | `losses[A] += 1` |
| Points | B: +3 |

`[assumed]` — arithmetic follows from the defaults (`pvpRakeBps = 1000`, `rakeToPoolBps = 3000`,
`pointsPvpWin = 3`).

---

## Example 2 — the same cards, the opposite roll

Variance is **per-battle** and can be large. Suppose the roll reverses: A rolls **1.40** and B rolls
**0.60**.

### Recompute the per-strike damage

**A attacks:**
```
scaled  = floor(24 × 1.40) = floor(33.6) = 33
effAtk  = floor(33 × 0.80) = floor(26.4) = 26
base    = max(1, 26 − 8)   = 18
Precision: floor(18 × 1.15) = floor(20.7) = 20
Shield (B): floor(20 × 0.70) = 14
→ A deals 14
```

**B attacks:**
```
scaled  = floor(18 × 0.60) = floor(10.8) = 10
effAtk  = floor(10 × 1.20) = floor(12.0) = 12
base    = max(1, 12 − 5)   = 7
→ B deals 7
```

### The race flips

- A needs `ceil(140/14) = 10` strikes.
- B needs `ceil(120/7) = 18` strikes.

| Round | Who | A HP | B HP |
|---|---|---|---|
| 0 | A (14) | 120 | 126 |
| 1 | B (7) | 113 | 126 |
| … | … | … | … |
| 16 | A (14) | 57 | 28 |
| 17 | B (7) | 50 | 28 |
| **18** | **A (14)** | 50 | **0** |

**Card A (Cinder Drake) wins on round 18** — the exact opposite of Example 1, with the **same cards and
same elements**, purely from the variance roll.

> [!IMPORTANT]
> This is the whole point of battle v2: **elements, skills, and the per-battle roll all matter.** The
> same two cards can produce opposite winners on different rolls. There is no "sure win," even with a
> clearly better card. `[proven]` mechanism; `[assumed]` illustrative rolls.

---

## Example 3 — equal cards, pure coin-flip behavior

Take two **identical** cards: same element, same skill, same HP/ATK/DEF. Then:

- Element multiplier: **neutral** (1.00 both).
- Skills: cancel out (e.g. both Precision, or both none).
- The only difference is the **variance roll** on each side.

If both roll the same factor, the fight is a **perfect tie** and the outcome falls to who strikes first
and, at the extreme, to the final `rng` bit. Across many such matches, the win rate converges to
**≈ 50%** — the documented coin-flip behavior for equal cards. `[assumed]` — statistical statement at
default `atkVarianceBps = 4000`.

---

## Reproducing these fights yourself

```solidity
// 1. Read the seeds and the fight's prevrandao
bytes32 sA = spc.seedOf(cardA);
bytes32 sB = spc.seedOf(cardB);

// 2. Profile both cards
(uint256 hpA, uint256 atkA, uint256 defA,, uint8 elA, uint8 skA) = battle.profileOf(cardA);
(uint256 hpB, uint256 atkB, uint256 defB,, uint8 elB, uint8 skB) = battle.profileOf(cardB);

// 3. Recompute _initRng(...) and run the 64-round loop with the same integer math
// 4. Compare your boolean to DuelDetail.aWins
```

`[proven]` — the fight is fully deterministic and replayable off-chain once you have the seeds and the
block's `prevrandao`.

---

## Next

- **[Battle overview](overview.md)**
- **[Resolution & damage](resolution-and-damage.md)**
- **[Lives, stakes & rake](lives-stakes-and-rake.md)**
