# Introduction

Spirit Cards (on-chain name **`SpiritCards`**, ticker **`SPC`**) is a collectible creature-card game where the
cards are **mined**, not sold from a shop at a fixed price. Your device searches for a number
(a `nonce`) that produces a hash with enough leading zero bits — a real proof-of-work, the same idea
as Bitcoin's, but tuned to run in seconds for cents of gas. Each card then carries an element,
a rarity, and battle stats that are **deterministically derived from its on-chain seed**, so anyone
can recompute them.

From there a card lives inside a loop: it can be **merged** (evolution, 2 → 1), **wagered in a duel**,
**staked** in a vault that shares a slice of real fees, and **counted toward an activity leaderboard**.

> [!NOTE]
> Everything described in this documentation is **run by smart contracts** and is **verifiable
> on-chain**. Nothing here is a promise of profit. Spirit Cards is a game and an experiment.

## In one sentence

> Spirit Cards is a mining game where a real proof-of-work earns you a deterministically-generated
> collectible creature card you can merge, battle, and stake — with **no token**, **no guaranteed
> return**, and **no payback period**.

## The three design rules

1. **Mine, don't buy.** A card is produced by work (`keccak256` PoW), not sold off a shelf. Packs
   exist for convenience but the canonical path is mining. [proven]
2. **Determinism from the seed.** Art, stats, rarity, element, and skill all fall out of the card's
   on-chain `seed`. The same seed always yields the same card. [proven]
3. **A tunable core, not an immutable one.** Every economic and battle parameter lives in the
   `Config` contract behind ownership (targeting a Safe multisig). The team can retune the game
   without redeploying contracts. [proven]

## The loop

```
挖 MINE → 熔 MERGE → ⚔ BATTLE → 押 STAKE → 榜 POINTS → repeat
```

Read the [Getting started](getting-started.md) guide to see the loop end-to-end, or jump into
[the collection](the-collection.md) to understand what you're actually collecting.

## What it is not

- **Not a token sale.** There is **no ERC-20**, no liquidity pool, no Uniswap listing. Value moves
  in ETH. [proven]
- **Not an investment product.** No APY, no yield guarantee, no "break-even timeline". The staker
  pool is a share of **real, variable fees** and can be small or zero. [proven]
- **Not a lottery.** Packs disclose their odds; rarity is derived from on-chain randomness, and there
  is no secondary "cash prize" tied to a pull. [proven]

## Where to go next

| If you want to… | Read |
|---|---|
| Understand the whole game in 10 minutes | [Getting started](getting-started.md) |
| Understand rarity, species, and stats | [The collection](the-collection.md) |
| See exactly how a card's numbers are computed | [Creatures, elements & rarity](creatures-elements-and-rarity.md) |
| Learn to mine | [Mining](../mining/README.md) |
| Understand the money model | [Economy](../economy/README.md) |
| Understand the duel math | [Battle](../battle/README.md) |
