# Getting started

This page walks you from "I have never heard of this" to "I mined my first card and know what to do
with it." It takes about ten minutes of reading and one transaction.

> [!IMPORTANT]
> Everything below costs **real ETH**. A card is a **game item**; it is not an investment and it may
> be worth nothing. There is no guarantee of any return.

---

## 1. Get a wallet and some ETH on Robinhood Chain

Spirit Cards runs on **Robinhood Chain**, an Arbitrum Orbit L2. The current **t8** rehearsal runs on the
**testnet** (`chainId 46630`); **mainnet `4663`** is the target, pending deployment (**t9**).

| Network | chainId | Gas token |
|---|---|---|
| Mainnet (target, pending) | `4663` | ETH |
| Testnet (current rehearsal, t8) | `46630` | ETH |

You need an EVM wallet (browser or mobile) and a small ETH balance for the **mint price** plus gas.
Blocks are fast (~100–250 ms), so confirmations feel instant. `[proven]`

- RPC (mainnet): `https://rpc.mainnet.chain.robinhood.com`
- The web app auto-switches a connected wallet to the correct network. `[proven]`

---

## 2. Open the web app

The web app is live at **`https://spiritcards.fun`**. See [Official links](../project/official-links.md).

The app has these sections:

```
Collection · Mine · Stake · Battle · Merge · Points · Docs (+ Pool & Profile)
```

---

## 3. Mine your first card (挖 MINE)

Mining is a real proof-of-work. The app (or the CLI miner) searches for a `nonce` such that:

```
keccak256(chainId ‖ SpiritCards ‖ yourAddress ‖ nonce)
```

has at least `requiredBits()` leading zero bits. At the starting difficulty that is about
**1,048,576 hashes on average** — usually a couple of seconds on a decent device.

Steps:

1. Connect your wallet.
2. Go to **Mine**. The mining engine runs in the background and finds a valid `nonce`. `[proven]`
3. Send the mint transaction, paying the **current era price** (starts at `0.00037 ETH`).
4. You receive a card (with a fresh on-chain seed) **and 1 chip**.

A chip is a consumable: it gives you **−30%** on your *next* mint (and is spent when you use it).
See [Mining → How to mint](../mining/how-to-mint.md). `[proven]`

Two limits apply per wallet: a **cooldown** (default 45 s) and the per-epoch cap. Read
[Difficulty & network pace](../mining/difficulty-and-network-pace.md).

---

## 4. Look at what you got

Your card's element, rarity, and battle stats are computed from its seed. Open the **Collection**
to see the card's art (rendered from the seed) and its battle profile. You can independently verify
`Battle.profileOf(cardId)` on-chain.

See [Creatures, elements & rarity](creatures-elements-and-rarity.md) for the formulas.

---

## 5. Decide what to do with it

A card is an input to the loop. You can:

| Action | Page | In one line |
|---|---|---|
| **MERGE** two cards → one higher-level card | [Merge & forging](../economy/merge-and-forging.md) | Evolution; a 7% chance the merge is a dud |
| **BATTLE** a card for a stake | [Battle](../battle/README.md) | Escrow duel; winner takes the pot minus rake |
| **STAKE** a card in the vault | [Staking & rewards](../economy/staking-and-rewards.md) | Lock it for a weight-based share of the pool |
| **Hold / trade** | [The collection](the-collection.md) | Low serial numbers are provenance |
| **Buy a pack** | [Packs](../economy/packs.md) | Convenience bundle at a discount (no PoW) |

The whole point of the loop is to run it: mine, merge toward higher tiers, battle for stakes and
records, and stake the cards you are not actively fighting with.

---

## 6. Track points (榜 POINTS)

Playing earns on-chain **activity points**: mine **1**, merge **2**, stake **2**, PvP win **3**.
Points feed a leaderboard and seasonal competitions. **Points have no monetary value.**

See [Points & leaderboard](../gameplay/points-and-leaderboard.md).

---

## Cheat-sheet

```
挖 MINE   → pay era price, get card + 1 chip       (chip → −30% next mint)
熔 MERGE  → burn 2 cards → 1 forged card           (fee 0.00002 ETH, 7% dud)
⚔ BATTLE → escrow card + ETH vs another card       (winner-takes-pot, −10% rake, −1 life to loser)
押 STAKE  → lock card 0/7/30/90/180/365 d          (share of pool by weight; can still fight)
榜 POINTS → play, earn points, climb the board     (points = no monetary value)
```

---

## Next reads

- **[Mining](../mining/README.md)** — the deep mechanics
- **[Economy](../economy/README.md)** — price, packs, staking, split
- **[Battle](../battle/README.md)** — the duel engine
- **[Glossary](../project/glossary.md)** — terms in EN / RU / ZH
