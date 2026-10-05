# Battle — overview

This page describes the duel **lifecycle** and the guarantees the contract provides. It is the frame;
the [elements](elements.md), [skills](skills.md), and [resolution](resolution-and-damage.md) pages fill
in the math.

---

## The duel lifecycle

### 1. Create — `createDuel(cardA, stake)`

The creator (player **A**) commits:

- **one card** (`cardA`), and
- an ETH **stake** (`msg.value == stake`, and `stake > 0`).

The card is **escrowed** by the Battle contract (or, if it is staked, locked inside the vault — see
below). An **open duel** is recorded. `[proven]`

```solidity
function createDuel(uint256 cardA, uint256 stake) external payable nonReentrant returns (uint256 id)
```

Emits `DuelCreated(id, a, cardA, stake)`.

### 2. Accept — `acceptDuel(id, cardB)`

The accepter (player **B**) commits:

- **one card** (`cardB`, which must belong to B), and
- an **equal** stake (`msg.value == d.stake` exactly).

The duel **resolves immediately** in this same transaction. B cannot be A (`SELF` guard). `[proven]`

```solidity
function acceptDuel(uint256 id, uint256 cardB) external payable nonReentrant
```

Because resolution happens inside `acceptDuel`, B's transaction **is** the fight. B signs the intent to
accept, but the exact outcome depends on the block B's transaction lands in.

### 3. Cancel — `cancelDuel(id)`

While a duel is still **open**, its creator A can cancel it. A's card and stake are returned. `[proven]`

```solidity
function cancelDuel(uint256 id) external nonReentrant
```

Emits `DuelCancelled(id, a, cardA, stake)`.

> [!NOTE]
> A duel cannot be accepted by its own creator (`SELF`), and a closed duel cannot be re-cancelled
> (`CLOSED`). There is no time limit on an open duel — A decides when to cancel.

---

## Escrow: where the card actually lives

The Battle contract escrows cards in one of two ways: `[proven]`

| Card state | What happens | Custody |
|---|---|---|
| **Wallet-owned** | `transferFrom(A → Battle)` | Battle contract holds it |
| **Staked in vault** | `vault.lockForBattle(card, staker)` | **Vault keeps custody**; card only marked `inBattle` |

This dual path is what allows a **staked card to fight** without ever leaving the vault, so the staker
keeps earning and **no NFT approval is needed**. Details in
[Lives, stakes & rake](lives-stakes-and-rake.md).

---

## What determines the winner

`Battle._resolve(cardA, cardB, id)` runs a deterministic, on-chain fight using: `[proven]`

1. **Stats** — HP / ATK / DEF derived from each card's seed.
2. **Elements** — a rock-paper-scissors multiplier of ±20%.
3. **Skills** — one of six effects per card.
4. **Per-battle variance** — each side's attack is scaled once by a random factor in [0.6, 1.4].

The randomness comes from a keccak chain seeded with the accept block's `prevrandao`:

```solidity
_initRng = keccak256(seedOf[a], seedOf[b], id, block.prevrandao, address(this));
```

Because it is seeded from public on-chain data, the fight is **reproducible**: anyone can replay the
exact result off-chain. `[proven]`

---

## Why it is (deliberately) a gamble

If battle were decided purely by stats, a stronger card would win every time and the game would
degenerate into "who has the biggest card." The v2 engine adds three sources of swing:

- **Elements** can swing damage ±20% — often enough to beat a stat gap.
- **Skills** like Crit (×2) and Shield (−30%) are high-impact.
- **Per-battle variance** (±40%) reshapes the fight with each accept.

The design consequence: **close cards are close to a coin flip.** At default parameters, an
equal-stats matchup is ≈ 50/50, and a ~25%-stronger card wins ≈ 72% (underdog ≈ 28%). `[assumed]`
— estimate at `atkVarianceBps = 4000`.

> [!TIP]
> This is why the docs never promise a win. Even a clearly better card can lose; even an underdog has a
> real chance. Battle is a **wager**, not a contest of sure things.

---

## Batching and points

- A **PvP win** awards the winner `pointsPvpWin` (default **3**) through the `Points` contract. `[proven]`
- Wins/losses are recorded **on the winning/losing card**: `wins[card]++`, `losses[card]++`. `[proven]`

---

## The events (the full audit trail)

| Event | Emitted by | Meaning |
|---|---|---|
| `DuelCreated(id, a, cardA, stake)` | `createDuel` | Open duel created |
| `DuelDetail(id, elA, elB, skA, skB, aWins)` | `_settle` | Rich result: elements, skills, winner |
| `DuelResolved(id, winner, winCard, loseCard, payout, rake)` | `_settle` | Settled: winner, cards, payout, rake |
| `DuelCancelled(id, a, cardA, stake)` | `cancelDuel` | Creator cancelled |
| `CardBurned(card, owner)` | `_kill` | A card hit 0 lives |

`[proven]`

The `DuelDetail` event is specifically for the **UI and replays**: it exposes both elements and both
skills plus the boolean winner, so the front-end can animate the fight without re-deriving it.

---

## Reading it on-chain

```solidity
battle.duels(id)          // a, cardA, stake, open, aFromVault
battle.duelCount()        // number of duels ever created
battle.lives(card)        // remaining lives (0 if burned)
battle.wins(card)         // PvP wins on this card
battle.losses(card)       // PvP losses on this card
battle.profileOf(card)    // hp, atk, def, rarity, element, skill
battle.preview(a, b, id)  // a possible outcome under the CURRENT prevrandao
```

`[proven]`

> [!NOTE]
> `preview()` is only a *possible* outcome — it uses the current block's `prevrandao`, not the block
> your actual `acceptDuel` will land in. Treat it as a UI hint, not a prediction.

---

## Next

- **[Elements](elements.md)** — the RPS matrix
- **[Skills](skills.md)** — the six effects
- **[Resolution & damage](resolution-and-damage.md)** — the exact math
