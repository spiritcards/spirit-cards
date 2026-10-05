# Battle (⚔ BATTLE)

Battle is the competitive heart of Spirit Cards. It is an **open escrow duel on a stake**: two players
each commit **one card and an equal ETH stake**; the winner takes the whole pot minus a rake, and the
loser loses **one of that card's lives**.

> [!IMPORTANT]
> Battle is **zero-sum gambling between players** (plus a rake). You can lose your ETH **and** your card.
> The outcome is **deterministic and verifiable on-chain**, but it is **not** decided purely by stats —
> elements, skills, and a per-battle roll make close fights a genuine gamble. There is **no guaranteed
> win** and no guaranteed return.

The battle engine is **v2**, and it is the most intricate part of the game. This section documents it
completely: the duel lifecycle, elements, skills, the exact damage formula, lives and burn, the rake,
and worked examples.

---

## Read in order

| Page | What you'll learn |
|---|---|
| **[Overview](overview.md)** | What a duel is; `createDuel` / `acceptDuel` / `cancelDuel`; why it's a gamble |
| **[Elements](elements.md)** | The 4 elements, the full 4×4 advantage matrix, ±20% |
| **[Skills](skills.md)** | The 6 skills and exactly what each does per strike |
| **[Resolution & damage](resolution-and-damage.md)** | The damage formula, variance, 64 alternating rounds, tiebreaks, RNG fairness |
| **[Lives, stakes & rake](lives-stakes-and-rake.md)** | 3 lives, burn, escrow, staked cards fighting, the rake split, events |
| **[Worked examples](worked-examples.md)** | Two named cards fought round-by-round with concrete numbers |

---

## The 60-second version

- **Format:** A creates an open duel by escrowing a card + a stake. B accepts by escrowing a card +
  an **equal** stake. The fight **resolves in the same transaction** as B's acceptance.
- **Inputs to the outcome:** the two cards' **stats** (from their seeds), their **elements** (RPS,
  ±20%), their **skills**, and a **per-battle variance** (±40%) derived from the accept block.
- **Winner:** takes the pot (`2 × stake`) minus a **10% rake**.
- **Loser:** loses **1 life**. At **0 lives the card is burned**.
- **Rake split:** **70% treasury / 30% staker pool**.
- **Fairness:** the exact roll depends on the **accept block's `prevrandao`**, which the accepter can't
  know when signing — so no one can pre-select a winning fight.

```
createDuel(cardA, stake)   →  open duel, cardA + stake escrowed
acceptDuel(id, cardB)      →  cardB + equal stake escrowed → resolve now
cancelDuel(id)             →  creator's card + stake returned
```

---

## What makes battle a *gamble*

Battle has four layers besides raw stats, and each one can flip a close fight:

| Layer | Range | From |
|---|---|---|
| **Stats** | HP 50–224, ATK 8–47, DEF 4–34 | Seed |
| **Element** | ±20% damage | Seed |
| **Skill** | e.g. Crit ×2, Shield −30% | Seed |
| **Per-battle variance** | attack ×[0.6, 1.4] | Accept block's `prevrandao` |

The net effect, at default parameters: an **equal-stats matchup is roughly a coin flip**; a card about
**25% stronger wins ≈ 72%** of the time (the underdog still wins ≈ 28%); a much stronger card wins
almost always. `[assumed]` — estimate at default `atkVarianceBps = 4000`.

---

## Parameters (all tunable via `Config`)

| Key | Default | Meaning |
|---|---|---|
| `lives` | **3** | Lives per card |
| `pvpRakeBps` | **1000** | 10% rake on the pot |
| `rakeToPoolBps` | **3000** | 30% of rake → pool; 70% → treasury |
| `typeAdvBps` | **2000** | ±20% element advantage |
| `atkVarianceBps` | **4000** | ±40% per-battle attack roll |

`[proven]`

---

> [!WARNING]
> Do not treat battle as a way to "earn." It is a **game with a house edge** (the rake). Over many
> fights, players as a group pay the rake. See the [Legal disclaimer](../project/legal-disclaimer.md).
