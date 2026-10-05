# Spirit Cards

> **Collectible creature cards you _mine_, not buy.**
> Real proof-of-work, deterministic rarity derived from an on-chain seed, escrow duels on a
> stake, a staking vault that shares a slice of real fees, and an on-chain activity leaderboard.
>
> On-chain name: **Spirit Cards** (`SpiritCards`) · ticker: **SPC**
> Network: **Robinhood Chain** (an Arbitrum Orbit L2; mainnet `chainId 4663`, gas in **ETH**).
> Current live stack: **t8 rehearsal on testnet `chainId 46630`** (mainnet `4663` pending).

Spirit Cards is a game and an experiment. There is **no token**, no liquidity pool, and no promise
of profit. Cards are earned by doing work, then traded, merged, wagered, and staked. Everything that
looks like a payout is **a share of the real fees the project actually collects** — and that share
can go to zero. Points have **no monetary value**.

---

## The loop

```
挖 MINE → 熔 MERGE → ⚔ BATTLE → 押 STAKE → 榜 POINTS → repeat
```

| Node | What you do | What happens |
|---|---|---|
| **挖 MINE** | Find a valid `nonce`, pay the era price | You receive a card with stats + 1 chip (a chip gives −30% on your next mint) |
| **熔 MERGE** | Burn 2 cards | You get 1 card of a higher level (a small chance the merge is a "dud") |
| **⚔ BATTLE** | Escrow a card + ETH against another card | Winner takes the pot minus rake; loser loses 1 of 3 lives (❤) |
| **押 STAKE** | Lock a card in the vault for 0 / 7 / 30 / 90 / 180 / 365 days | Earn a weight-based share of the pool; a staked card can still fight |
| **榜 POINTS** | Play and compete | Accumulate on-chain activity points; seasonal leaderboard |

---

## At a glance

| Property | Value |
|---|---|
| Chain | Robinhood Chain (Arbitrum Orbit L2) |
| Mainnet chainId | `4663` |
| Gas token | ETH |
| Block time | ~100–250 ms |
| On-chain name / ticker | Spirit Cards / `SPC` |
| Total supply (base) | **8888** (`maxSupply`) |
| Species | **16** (8 universal + 8 dragons) |
| Rarities | 6 — N / R / SR / UR / SSR / Prism |
| Elements | 4 — Ember, Stone, Gale, Tide |
| Skills | 6 — none, Crit, Shield, Pierce, Precision, Vigor |
| Mining difficulty | `baseBits = 20`, +0.33 bit per price-era |
| Starting price | `0.00037 ETH` (≈ $1 at ETH ≈ $3000) |
| Price step | +25% per era (`priceStepBps = 2500`) |
| Era size | **1111** cards → **8 eras** (8 × 1111 = 8888) |
| Merge | 2 → 1, fee `0.00002 ETH`, 7% chance of a "dud" |
| Staking tiers | 6 (1× … 40× weight) |
| Battle | open escrow duel, 3 lives, 10% rake |
| Points (mine/merge/stake/pvp win) | 1 / 2 / 2 / 3 |
| Native token | **None — ETH only** |

---

## Start here

- **[Introduction](introduction/README.md)** — what Spirit Cards is and how to think about it
- **[The collection](introduction/the-collection.md)** — 8888 cards, 16 species, determinism from the seed
- **[Creatures, elements & rarity](introduction/creatures-elements-and-rarity.md)** — the stat system
- **[Getting started](introduction/getting-started.md)** — connect a wallet, mine your first card
- **[Mining](mining/README.md)** — real PoW, difficulty, cooldown, chips
- **[Economy](economy/README.md)** — price ladder, packs, staking, merge, revenue split, referrals
- **[Battle](battle/README.md)** — elements, skills, damage resolution, lives, rake (this is the deep section)
- **[Gameplay](gameplay/README.md)** — points, leaderboard, seasons
- **[Project](project/README.md)** — contracts & addresses, security, official links, FAQ, roadmap, glossary

---

## No promises

> [!WARNING]
> Spirit Cards is a **game / experiment**, not an investment.
>
> - **No APY, no guaranteed return, no "payback period".** Any reward described here is a
>   **share of real fees the project actually collects**, and it may be small or zero.
> - **Points have no monetary value** and confer no claim on anything.
> - **Battle is zero-sum gambling** (players vs. players, plus a rake): you can lose both ETH and
>   the card you wagered.
> - **Card value can fall to zero.** Minting costs real ETH and gives you a game item.
> - This documentation is **informational**. It is not financial, legal, or tax advice.

See the full [Legal disclaimer](project/legal-disclaimer.md).

---

*Tags used across these pages: `[proven]` = verified in code / on-chain · `[assumed]` = inference or estimate ·
`[planned]` = not yet shipped.*
