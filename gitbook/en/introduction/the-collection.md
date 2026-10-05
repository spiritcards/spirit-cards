# The collection

Spirit Cards is a fixed-supply collectible **of 8888 base cards**. There is no inflation schedule
beyond that number: once the base supply is exhausted, no more cards can be **mined or bought in
packs**. Merging creates *forged* cards in a separate namespace (see below), but it does not expand
the base mint count.

| Property | Value |
|---|---|
| Base supply (mined + packs) | **8888** (`maxSupply`) |
| Species (visual/creature types) | **16** — 8 universal + 8 dragons |
| Rarities | 6 — N, R, SR, UR, SSR, Prism |
| Elements | 4 — Ember, Stone, Gale, Tide |
| Skills | 6 — none, Crit, Shield, Pierce, Precision, Vigor |
| Starting lives per card | 3 (❤) |
| Token standard | ERC-721 (minimal) + ERC-2981 royalty |
| Royalty | 5% on secondary sales → treasury |

`[proven]` — all of the above are parameters/behaviour read from the contracts.

---

## How a card is born

Every card gets a **32-byte seed** the moment it is created. The seed is the single source of truth
for the card's appearance and stats.

- **Mined card:** `seed = keccak256(block.prevrandao, miner, nonce, id)` [proven]
- **Pack card:** `seed = keccak256(block.prevrandao, buyer, id, index)` [proven]
- **Merged (forged) card:** `seed = keccak256(seedOf[a], seedOf[b], block.prevrandao, msg.sender)` [proven]

Because the seed is written on-chain at mint time, it is **immutable** and **recomputable** by anyone.
There is no server deciding what you got.

---

## Two supply namespaces

The game keeps two distinct sets of token IDs so that "how many were minted" stays honest:

| Namespace | Where it comes from | ID range | Counted in `maxSupply`? |
|---|---|---|---|
| **Base** | `mine()` and `mintPack()` | `1 … 8888` | Yes |
| **Forged** | `mergeBurn()` (2 → 1) | `10,000,001 …` | No — separate counter |

- `totalMinted` and `paidMinted` track the **base** supply (mined + pack). [proven]
- `forged` tracks merge output separately. Merging burns 2 base cards and creates 1 forged card, so
  the **live card count can fall** even though token IDs never collide. [proven]

> [!NOTE]
> This split is why merging is described as deflationary for the base set: two base cards leave
> circulation and are replaced by one *forged* card in a different namespace.

---

## Serial numbers and provenance

Base cards carry their mint order as their token ID (`1 … 8888`). That makes **low IDs a form of
provenance** — early miners hold the low serial numbers. [proven]

Battle history is also stored per card: `wins[card]` and `losses[card]` accumulate on-chain, so a
card's **PvP record travels with it** when it is sold. [proven]

---

## Species: 8 universal + 8 dragons

The art pipeline renders **16 species** deterministically from the seed: **8 universal** creatures
usable in any lineup, and **8 dragon** species as the higher tier. The species (which art layers get
composited) is selected from the seed, and the layers are served by the web app's art catalog.
`[proven]` for the 16-species pipeline; `[assumed]` for any specific artist naming.

The creature's **rarity tier** (N → Prism) is independent of species and is also seed-derived — see
[Creatures, elements & rarity](creatures-elements-and-rarity.md).

---

## Determinism: proof you can check

Because every stat comes from `seedOf(card)`, this is fully reproducible:

```solidity
// Simplified from Battle.sol
uint256 s = uint256(spc.seedOf(card));
uint256 rarity  = (s >> 248) % 6;              // 0..5
uint256 atk     = 8  + ((s >> 240) & 0xFF) % 20 + rarity * 4;
uint256 def     = 4  + ((s >> 232) & 0xFF) % 16 + rarity * 3;
uint256 hp      = 50 + ((s >> 224) & 0xFF) % 100 + rarity * 15;
uint8   element = uint8((s >> 216) & 0x03);    // 0..3
uint8   skill   = uint8((s >> 208) % 6);       // 0..5
```

Anyone can read `seedOf` from the chain and recompute a card's stats, element, and skill without
trusting any front-end. `[proven]`

---

## Where to next

- **[Creatures, elements & rarity](creatures-elements-and-rarity.md)** — the stat model in detail
- **[Getting started](getting-started.md)** — your first card
- **[Mining](../mining/README.md)** — how cards are produced
