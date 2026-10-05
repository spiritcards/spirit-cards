# Creatures, elements & rarity

A Spirit Card has five derived attributes, all computed from its on-chain **seed**:

**rarity**, **HP**, **ATK**, **DEF**, **element**, and **skill**.

Nothing here is chosen by the player or the team at mint time. The seed determines everything, and
the seed is fixed by the block in which the card was created.

---

## Rarity

Rarity is the **top byte** of the seed, folded into six tiers.

```
rarity = (seed >> 248) % 6
```

| Value | Tier | Label |
|---|---|---|
| 0 | N | Normal |
| 1 | R | Rare |
| 2 | SR | Super Rare |
| 3 | UR | Ultra Rare |
| 4 | SSR | Special Super Rare |
| 5 | Prism | Prismatic (rarest) |

`[proven]` — the formula is exactly the one in `Battle.statsOf`.

> [!NOTE]
> Rarity is a **uniform draw over the seed's top byte**: each tier appears with probability ≈ 1/6
> across a large sample `[assumed — modulo bias over 256 values into 6 buckets is negligible]`. Rarity
> raises stats (below) but does **not** change the element or skill odds.

---

## The three base stats

```
atk = 8  + ((seed >> 240) & 0xFF) % 20 + rarity * 4    //   8..27  + rarity·4
def = 4  + ((seed >> 232) & 0xFF) % 16 + rarity * 3    //   4..19  + rarity·3
hp  = 50 + ((seed >> 224) & 0xFF) % 100 + rarity * 15  //  50..149 + rarity·15
```

Each stat has a **flat random base**, plus a **rarity bonus**:

| Stat | Base range | Per-rarity bonus | Max (rarity = Prism) |
|---|---|---|---|
| ATK | 8 – 27 | +4 | 27 + 20 = **47** |
| DEF | 4 – 19 | +3 | 19 + 15 = **34** |
| HP | 50 – 149 | +15 | 149 + 75 = **224** |

`[proven]` for the formulas and ranges from `Battle.statsOf`.

### Why this matters

- A **Prism** card is not just prettier — it can carry up to **+20 ATK, +15 DEF, +75 HP** over a
  Normal card of identical seed. That is a large advantage.
- Because the base range and the rarity roll are independent, a **high-roll Normal** can still beat a
  **low-roll R**, but the tier advantage compounds at the top.
- Stats are the *baseline*; the actual fight also factors in element, skill, and per-battle variance
  (see [Battle](../battle/README.md)).

---

## Elements

Every card has one of **four elements**, taken from two bits of the seed:

```
element = (seed >> 216) & 0x03   // 0..3
```

| Value | Element | Symbol theme |
|---|---|---|
| 0 | **Ember** | Fire |
| 1 | **Stone** | Earth |
| 2 | **Gale** | Wind |
| 3 | **Tide** | Water |

Elements form a **rock-paper-scissors cycle**

```
Ember (0) → Stone (1) → Gale (2) → Tide (3) → Ember (0)
```

The advantaged side deals **+20%** damage and the disadvantaged side deals **−20%** (`typeAdvBps = 2000`).
Full matrix and discussion: [Battle → Elements](../battle/elements.md). `[proven]`

---

## Skills

Every card has one of **six skills**, taken from the seed:

```
skill = (seed >> 208) % 6   // 0..5
```

| Value | Skill | Effect |
|---|---|---|
| 0 | none | No effect |
| 1 | **Crit** | 20% chance to deal ×2 damage |
| 2 | **Shield** | −30% on incoming damage |
| 3 | **Pierce** | Ignores the defender's DEF |
| 4 | **Precision** | +15% damage, always |
| 5 | **Vigor** | +20% to maximum HP |

Full details: [Battle → Skills](../battle/skills.md). `[proven]`

---

## Worked stat example

Take an illustrative seed whose relevant bytes give:

| Field | Value | Result |
|---|---|---|
| rarity byte `>> 248` | `2` | **SR** |
| atk byte | `11` | `8 + 11 + 2·4 = ` **27** ATK |
| def byte | `8` | `4 + 8 + 2·3 = ` **18** DEF |
| hp byte | `73` | `50 + 73 + 2·15 = ` **153** HP |
| element bits | `0` | **Ember** |
| skill byte | `4` | **Precision** |

So this card reads: **SR · Ember · Precision · 153 HP · 27 ATK · 18 DEF.**

> [!NOTE]
> The seed above is a constructed illustration, not a real minted card. On-chain you read the real
> seed with `spc.seedOf(id)` and run the same arithmetic.

---

## Reading a card on-chain

```solidity
// SpiritCards.sol
mapping(uint256 => bytes32) public seedOf;         // the card's seed
// Battle.sol
function profileOf(uint256 card)
    external view
    returns (uint256 hp, uint256 atk, uint256 def, uint256 rarity, uint8 element, uint8 skill);
```

`Battle.profileOf(card)` returns the full battle profile in a single call. `[proven]`

---

## Next

- **[Getting started](getting-started.md)**
- **[Battle → Elements](../battle/elements.md)** · **[Battle → Skills](../battle/skills.md)**
