# Resolution & damage

This is the exact, reproducible algorithm behind every duel. Everything runs **on-chain** inside
`Battle._resolve`, seeded from public data, so any fight can be **replayed off-chain** and verified.

---

## Inputs

From each card's seed, the resolver reads: `[proven]`

- **HP, ATK, DEF, rarity** (`statsOf`)
- **element** (`elementOf`, 0..3)
- **skill** (`skillOf`, 0..5)

And from the environment:

- **`block.prevrandao`** of the block that executes the fight (the `acceptDuel` block),
- the duel **id**,
- the two cards' seeds.

---

## Step 1 — seed the RNG

```solidity
function _initRng(uint256 a, uint256 b, uint256 id) internal view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(
        spc.seedOf(a), spc.seedOf(b), id, block.prevrandao, address(this)
    )));
}
```

`[proven]`

The RNG is a **keccak chain**: each later step is `keccak256(previous)`. Because it is derived from
`prevrandao` + the card seeds + the duel id, the entire fight is **deterministic given the block**.

---

## Step 2 — per-battle attack variance (±40%)

Each side's **attack is scaled once**, before any strikes:

```solidity
function _roll(uint256 atk, uint256 varBps, uint256 rng)
    internal pure returns (uint256 scaled, uint256 newRng)
{
    newRng = uint256(keccak256(abi.encodePacked(rng)));
    uint256 delta  = newRng % (2 * varBps + 1);   // 0 .. 8000  (varBps = 4000)
    uint256 factor = 10000 + delta - varBps;      // 6000 .. 14000
    scaled = (atk * factor) / 10000;
}
```

`[proven]`

- **Range:** factor ∈ **[6000, 14000]**, i.e. attack × **[0.60, 1.40]** — the **±40%** roll.
- Applied **once per side** per battle (not per round). So each side's attack is fixed for the whole
  fight — meaning **each side's per-strike damage is constant**, except for Crit's per-round rolls.

> [!IMPORTANT]
> Variance is a **per-battle** multiplier, not per-round. A side that rolls high keeps that high attack
> for all 64 rounds; a side that rolls low is stuck low. This is why variance can decide a fight.

---

## Step 3 — elements

Element multipliers are computed once:

```solidity
(mlt[0], mlt[1]) = _elementMult(elementOf(a), elementOf(b));   // ±20% or neutral
```

See the [Elements](elements.md) matrix. `[proven]`

---

## Step 4 — Vigor and start HP

Vigor (+20% max HP) is applied **before** the fight begins, and the starting HP is remembered for the
tiebreak. `[proven]`

```
if skill == Vigor:  hp = hp × 1.20
startHp[0] = hp[0]; startHp[1] = hp[1];
```

---

## Step 5 — the strike formula

For a single strike by attacker `ai` against defender `di`:

```solidity
function _strike(uint256 atk, uint256 def, uint256 multBps,
                 uint8 atkSkill, uint8 defSkill, uint256 rng)
    internal pure returns (uint256)
{
    uint256 effAtk = (atk * multBps) / 10000;         // apply element ±20%
    if (atkSkill == SKILL_PIERCE) def = 0;            // pierce ignores DEF
    uint256 base = effAtk > def / 2 ? effAtk - def / 2 : 1;
    if (atkSkill == SKILL_PRECISION) base = (base * 115) / 100;  // +15%
    if (atkSkill == SKILL_CRIT && rng % 5 == 0) base = base * 2; // 20% ×2
    if (defSkill == SKILL_SHIELD) base = (base * 70) / 100;      // −30% incoming
    return base == 0 ? 1 : base;
}
```

`[proven]`

### In plain math

```
effAtk = ATK  (already scaled by ±40% variance)  × elementMult (±20%)
DEF'   = (attacker has Pierce) ? 0 : DEF
base   = max(1, effAtk − floor(DEF' / 2))          // defense is HALVED
base   = (attacker has Precision) ? floor(base × 1.15) : base
base   = (attacker has Crit and roll hits) ? base × 2 : base
base   = (defender has Shield) ? floor(base × 0.70) : base
damage = max(1, base)
```

Three things to internalize:

1. **DEF is halved** (`def / 2`) before subtraction — a 30-DEF card soaks only 15 per strike.
2. **Minimum damage is 1** — a strike always chips HP, even against huge DEF.
3. **Shield is applied last** and is evaluated on the **defender's** skill.

---

## Step 6 — the round loop (up to 64 alternating rounds)

```solidity
for (uint256 round = 0; round < 64; round++) {
    rng = keccak256(rng);              // advance RNG each round
    uint256 ai = round % 2;            // 0: A attacks, 1: B attacks
    uint256 di = 1 - ai;
    uint256 d = _strike(atk[ai], def[di], mlt[ai], sk[ai], sk[di], rng);
    hp[di] = d >= hp[di] ? 0 : hp[di] - d;
    if (hp[di] == 0) return ai == 0;   // A wins iff B's HP hit zero
}
```

`[proven]`

- **Up to 64 rounds.** In round `r`, the attacker is **A if `r` is even**, **B if odd** — so **A strikes
  on even rounds** (0, 2, 4, …) and **B on odd** (1, 3, 5, …).
- Each round **re-derives** `rng` (so Crit rolls differ per round).
- The **first side to reach 0 HP loses immediately**. The loop returns as soon as a side is emptied.

> [!NOTE]
> Because each side's strike damage is constant (only Crit varies), a fight is effectively a **race**:
> how many strikes does each side need to empty the other? Whichever needs **fewer** strikes wins — with
> A getting the first strike (an edge when the race is otherwise tied or won by A's first hit).

---

## Step 7 — tiebreak (if 64 rounds pass)

If neither side reaches 0 in 64 rounds, the winner is the side with the **higher remaining HP
fraction**: `[proven]`

```solidity
uint256 lh = hp[0] * startHp[1];
uint256 rh = hp[1] * startHp[0];
if (lh != rh) return lh > rh;      // cross-multiplied fraction comparison
return (rng & 1) == 0;             // absolute final tie → coin from rng
```

- Remaining fraction of A = `hp[0] / startHp[0]`; of B = `hp[1] / startHp[1]`. The contract compares
  them cross-multiplied (`hp[0]·startHp[1]` vs `hp[1]·startHp[0]`) to avoid division.
- Only on a **perfect tie** does the final `rng` bit decide (A wins if even).

In practice, at these damage scales a fight almost always ends well before round 64; the tiebreak is a
safety net.

---

## Determinism & replay

Given the inputs, the outcome is fixed. To **replay** a resolved duel `[proven]`:

1. Read `DuelDetail.duelId/elA/elB/skA/skB/aWins`.
2. Read both cards' `seedOf` and the fight's `prevrandao` (from the accept block).
3. Recompute `_initRng` and run the exact loop above.
4. The boolean must match `DuelDetail.aWins`.

Because `prevrandao` is public, this is fully auditable — nothing about the fight is hidden or
server-side.

---

## Fairness: why the accepter can't rig it

The outcome depends on **`block.prevrandao` of the accept block**. That value is not known when the
accepter signs the transaction — it is determined only when the transaction is included. So:

- The accepter cannot **select** a winning block at signing time.
- The creator cannot either — they only created the open duel, not the resolving block.
- Anyone can verify the result after the fact.

This is documented as the reason the fight is a genuine gamble rather than a sure thing. `[proven]`
mechanism; `[assumed]` wording for the fairness conclusion.

> [!WARNING]
> `block.prevrandao` is a **weak** source of randomness in adversarial settings. It is adequate for a
> game where no side can profit reliably from manipulating it, but it is not cryptographically secure
> randomness. Treat battle outcomes as in-game chance.

---

## Balance at default parameters

At `atkVarianceBps = 4000` and `typeAdvBps = 2000`: `[assumed]`

| Matchup | Approx. win rate for the stronger card |
|---|---|
| Equal stats | ≈ **50%** (coin flip) |
| ~25% stronger | ≈ **72%** (underdog ≈ **28%**) |
| Much stronger | ≈ **always** |

These are **estimates** at default settings; changing `atkVarianceBps` or `typeAdvBps` changes them.
They are not guarantees about any specific fight.

---

## Worked example

See **[Worked examples](worked-examples.md)** for two named cards fought round-by-round with the exact
arithmetic above.

---

## Reading it on-chain

```solidity
battle.preview(a, b, id)     // a possible outcome under the CURRENT prevrandao
battle.statsOf(card)         // hp, atk, def, rarity
battle.elementOf(card)       // 0..3
battle.skillOf(card)         // 0..5
config.atkVarianceBps()      // 4000
config.typeAdvBps()          // 2000
```

`[proven]`

---

## Next

- **[Lives, stakes & rake](lives-stakes-and-rake.md)**
- **[Worked examples](worked-examples.md)**
