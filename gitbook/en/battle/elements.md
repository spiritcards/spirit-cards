# Elements

Every card has one of **four elements**, taken from two bits of its seed:

```solidity
function elementOf(uint256 card) public view returns (uint8) {
    return uint8((uint256(spc.seedOf(card)) >> 216) & 0x03); // 0..3
}
```

`[proven]`

| Value | Element | Flavor |
|---|---|---|
| 0 | **Ember** | Fire |
| 1 | **Stone** | Earth / rock |
| 2 | **Gale** | Wind |
| 3 | **Tide** | Water |

---

## The cycle

Elements form a strict **rock-paper-scissors loop** where each element beats exactly one other:

```
Ember (0) → Stone (1) → Gale (2) → Tide (3) → Ember (0)
```

In words:

- **Ember beats Stone**
- **Stone beats Gale**
- **Gale beats Tide**
- **Tide beats Ember**

`[proven]` — `_beats(x, y)` returns true when `y == (x + 1) % 4`.

---

## The damage effect

When two cards meet:

```solidity
function _elementMult(uint8 elA, uint8 elB) internal view returns (uint256 mltA, uint256 mltB) {
    uint256 adv = config.typeAdvBps();       // 2000 = ±20%
    if (_beats(elA, elB)) return (10000 + adv, 10000 - adv); // A +20%, B −20%
    if (_beats(elB, elA)) return (10000 - adv, 10000 + adv); // A −20%, B +20%
    return (10000, 10000);                                    // neutral
}
```

- The **advantaged** side multiplies its attack by **1.20** (`+20%`).
- The **disadvantaged** side multiplies its attack by **0.80** (`−20%`).
- **Neutral** matchups (same element, or non-adjacent pairs) are **1.00 / 1.00**.

`[proven]` — `typeAdvBps = 2000` by default.

> [!NOTE]
> The multiplier is applied to the **attacker's attack** (`effAtk = atk × mlt / 10000`) inside the strike
> routine, before defense is subtracted. See [Resolution & damage](resolution-and-damage.md).

---

## The full 4×4 advantage matrix

Row = attacker **A**, column = defender **B**.

- **A+** → A deals **×1.20**, B deals **×0.80**
- **B+** → A deals **×0.80**, B deals **×1.20**
- **=** → both deal **×1.00** (neutral)

| A \ B | Ember (0) | Stone (1) | Gale (2) | Tide (3) |
|---|---|---|---|---|
| **Ember (0)** | = | **A+** | = | **B+** |
| **Stone (1)** | **B+** | = | **A+** | = |
| **Gale (2)** | = | **B+** | = | **A+** |
| **Tide (3)** | **A+** | = | **B+** | = |

`[proven]` — derived directly from `_beats`.

### Reading the matrix

- **Diagonal** (same element) is always **neutral** — no ember-vs-ember bonus.
- **6 of the 16 cells are wins** (one per ordered beating pair). Actually there are **4 beating pairs**,
  each contributing one A+ cell and one B+ cell → **4 A+ cells and 4 B+ cells**.
- The remaining **8 cells are neutral** (diagonal 4 + the 4 "non-adjacent" pairs: Ember–Gale,
  Stone–Tide).

---

## Why four elements (and not two)

A 4-cycle gives **two kinds of neutral**: same-element (mirror) and opposite-element (non-adjacent).
This produces a richer matchup table than a 2- or 3-element wheel:

- **Mirror** (Ember vs Ember): pure stat + skill + variance — no element edge.
- **Beating** (Tide vs Ember): a real ±20% swing each way.
- **Non-adjacent** (Ember vs Gale): neutral, but neither "mirrors."

That spread means element is **influential but not decisive** — it can flip a close fight, but it will
not beat a much bigger stat gap on its own.

---

## A quick example

**Tide (B) vs Ember (A):** Tide beats Ember, so:

- A (Ember) attack multiplier = **0.80**
- B (Tide) attack multiplier = **1.20**

If both had identical base attacks, B would deal **1.5×** A's damage in the element term alone. Combined
with a shield skill or a higher HP roll, this is exactly the kind of edge that decides a close duel — see
the [worked example](worked-examples.md).

---

## Reading it on-chain

```solidity
battle.elementOf(card)   // 0..3
config.typeAdvBps()      // 2000 (±20%)
```

`[proven]`

---

## Next

- **[Skills](skills.md)**
- **[Resolution & damage](resolution-and-damage.md)**
- **[Worked examples](worked-examples.md)**
