# Skills

Every card has one of **six skills**, taken from its seed:

```solidity
function skillOf(uint256 card) public view returns (uint8) {
    return uint8((uint256(spc.seedOf(card)) >> 208) % 6); // 0..5
}
```

`[proven]`

| Value | Skill | Constant | Effect |
|---|---|---|---|
| 0 | **none** | `SKILL_NONE` | No effect |
| 1 | **Crit** | `SKILL_CRIT` | **20% chance** to deal **×2** damage |
| 2 | **Shield** | `SKILL_SHIELD` | **−30%** incoming damage |
| 3 | **Pierce** | `SKILL_PIERCE` | **Ignores** the defender's DEF |
| 4 | **Precision** | `SKILL_PRECISION` | **+15%** damage, **always** |
| 5 | **Vigor** | `SKILL_VIGOR` | **+20%** to **maximum HP** |

`[proven]`

A skill is **deterministic from the seed** — the player does not choose or reroll it. Each card has
exactly one skill.

---

## How each skill is applied

Skill effects live in `_strike` (per-attack) and in the setup phase (for Vigor). Below is the exact
behaviour per strike, in the order the contract applies it. `[proven]`

### Vigor (5) — +20% max HP

Applied **once at battle start**, not per strike:

```solidity
if (sk[0] == SKILL_VIGOR) hp[0] = (hp[0] * 120) / 100;
if (sk[1] == SKILL_VIGOR) hp[1] = (hp[1] * 120) / 100;
```

A 120-HP card with Vigor starts the fight at **144 HP**. Because it is a **percentage**, Vigor favors
high-HP cards.

### Pierce (3) — ignore DEF

```solidity
if (atkSkill == SKILL_PIERCE) def = 0;
```

The attacker's strike subtracts **nothing** for the defender's DEF. Against a high-DEF tank this is a
large boost; against a 0-effective-DEF target it is worth little.

### Precision (4) — +15%, always

```solidity
if (atkSkill == SKILL_PRECISION) base = (base * 115) / 100;
```

A flat **+15%** on every landed strike. Applied **after** defense is subtracted, so it scales the
*net* damage, not the raw attack.

### Crit (1) — 20% chance to double

```solidity
if (atkSkill == SKILL_CRIT && rng % 5 == 0) base = base * 2;
```

Each round draws a fresh `rng`; when `rng % 5 == 0` (a 1-in-5 chance) the strike deals **×2**. Over a
long fight the **expected** multiplier converges to ≈ **1.2×** (0.8×1 + 0.2×2), but the variance is
large — a lucky crit can end a fight early. `[assumed]` — the 1.2× expectation is a statistical
statement over many rounds.

### Shield (2) — −30% incoming

```solidity
if (defSkill == SKILL_SHIELD) base = (base * 70) / 100;
```

Applied when **this** card is the **defender**: incoming damage is cut by **30%**. Shield is evaluated
on the defender's skill, so it is a **defensive** trait.

### none (0)

No modifier.

---

## Order of operations in one strike

Putting it together, a single strike computes: `[proven]`

```
1. effAtk = ATK × elementMult            // ±20% from elements, inside _strike
2. if attacker has Pierce:  DEF' = 0
   else:                    DEF' = DEF
3. base = max(1, effAtk − floor(DEF' / 2))
4. if attacker has Precision:  base = floor(base × 1.15)
5. if attacker has Crit and roll hits (20%):  base = base × 2
6. if defender has Shield:  base = floor(base × 0.70)
7. damage = max(1, base)
```

(Step 1 happens after the per-battle variance has already scaled `ATK` once — see
[Resolution & damage](resolution-and-damage.md).)

> [!NOTE]
> **Pierce and Precision are attack-side** traits; **Shield is a defense-side** trait; **Vigor** is a
> setup trait; **Crit** is a per-round attack-side gamble. A card can only ever have **one** of these.

---

## Which skills are strong?

Rough qualitative guide (not a guarantee — matchups and variance dominate): `[assumed]`

| Skill | Strengths | Weaknesses |
|---|---|---|
| **Pierce** | Devastating vs. high-DEF tanks (negates the biggest defensive stat) | Worthless vs. low-DEF / already-Pierced targets |
| **Precision** | Reliable, always-on +15% | No high-roll ceiling; modest |
| **Crit** | Highest ceiling; can steal fights | High variance; no effect on defense |
| **Shield** | Excellent vs. high-ATK attackers (−30% flat) | Does nothing for your own damage |
| **Vigor** | Great on high-HP cards (+20%) | Small on low-HP cards |
| **none** | — | No edge; relies purely on stats/elements |

Because the element multiplier shakes out to ±20% and variance is ±40%, even a "bad" skill is often
masked in close fights — which is precisely the design goal.

---

## Reading it on-chain

```solidity
battle.skillOf(card)     // 0..5
battle.profileOf(card)   // includes skill
```

`[proven]`

---

## Next

- **[Resolution & damage](resolution-and-damage.md)** — where all factors combine
- **[Worked examples](worked-examples.md)** — a full round-by-round fight
