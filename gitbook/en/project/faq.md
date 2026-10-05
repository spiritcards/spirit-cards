# FAQ

Plain answers to the questions people actually ask.

---

### Is Spirit Cards an investment?

No. It is a **game and an experiment**. There is no token, no APY, no guaranteed return, and no
"payback period." Cards are game items and can be worth nothing.

### Do I need to buy a token?

No. There is **no ERC-20 token at all**. Everything is paid in **ETH** (mint, merge, packs, stakes).
`[proven]`

### How do I get a card?

**Mine** it: find a `nonce` whose hash has enough leading zero bits, then pay the era price in a mint
transaction. You can also buy a **pack** (which skips the PoW for convenience, at a discount). See
[Mining](../mining/README.md) and [Packs](../economy/packs.md).

### How much does a card cost?

The mint price **starts at `0.00037 ETH`** (≈ $1 at ETH ≈ $3000) and rises **+25% each era** (era = 1111
cards), for **8 eras**. See the [price ladder](../economy/price-and-eras.md).

### What is a "chip"?

A chip (ERC-1155) gives **−30%** on your next mint. You **earn one chip only when you pay full price**;
using a chip consumes it. So a chip is a one-shot coupon, not a perpetual discount. `[proven]`

### What is the total supply?

**8888** base cards (`maxSupply`). There are **16 species** (8 universal + 8 dragons), **6 rarities**,
**4 elements**, and **6 skills**. `[proven]`

### Are the cards random?

Yes, but **deterministically** so. Everything (rarity, stats, element, skill, art) is derived from the
card's **on-chain seed**, written at mint time. Anyone can recompute it. The seed includes the mint
block's `prevrandao`, so traits are fixed only once your transaction lands. `[proven]`

### How does mining difficulty change?

The base is **20 bits**, rising **+0.33 bit per era** (≈ +1 bit every ~3 eras). There is **no difficulty
ratchet** that chases hash-rate. `[proven]`

### What is the cooldown?

**45 seconds per wallet** by default (`mineCooldown`), plus a per-epoch cap (default 1000 cards/hour).
`[proven]`

### What is merge?

Burn **2 cards → get 1** higher-level card ("forged", a separate ID namespace). Fee is `0.00002 ETH`.
There is a **7% chance the merge is a "dud"** (both cards burn, no child) to prevent arbitrage. `[proven]`

### How does staking pay?

You lock a card for 0/7/30/90/180/365 days at weights **1× / 5× / 10× / 20× / 30× / 40×** and earn a
**weight-based share of the staker pool**. The pool is funded **only by real fees** the project collects
(60% of mint/merge/pack fees, plus 30% of the PvP rake). **No guarantee** — the pool can be small or
zero. See [Staking & rewards](../economy/staking-and-rewards.md).

### Can a staked card still fight?

**Yes.** A staked card can be locked into a duel without leaving the vault, so the staker keeps earning
and **no NFT approval is needed**. If it dies in battle, its pending rewards are settled and the card
burns. `[proven]`

### How does battle work?

An **open escrow duel on a stake**: both sides commit a card + an equal ETH stake; the winner takes the
pot minus a **10% rake**; the loser loses **1 of 3 lives** (0 → burn). See [Battle](../battle/README.md).

### Is battle decided by stats?

Partly. Stats matter, but **elements (±20%), skills, and a per-battle roll (±40%)** all swing the
result. Equal cards are ≈ a coin flip; a ~25%-stronger card wins ≈ 72% (underdog ≈ 28%). `[assumed]`
at default settings.

### Can someone rig a duel?

The outcome depends on the **accept block's `prevrandao`**, which the accepter can't know when signing —
so no side can pre-select a winning fight. Results are **deterministic and replayable** off-chain.
`[proven]` mechanism.

### What happens to the rake?

**10% of the pot**, split **70% → treasury / 30% → staker pool**. `[proven]`

### How is revenue split?

Every fee (mint/merge/pack) is split **pool 60% / referral 10% / treasury 30% / reserve 0%**. `[proven]`

### How does referral work?

You set a referrer **once** (they must have minted). Of the 10% referral fund: a fixed **master ref takes
3% of gross** from every payer, and the payer's own referrer gets **7%**; with no referrer, the 7% stays
in the pool for a later sweep. `[proven]`

### What are points? Are they worth anything?

On-chain **activity points** (mine 1, merge 2, stake 2, PvP win 3). They feed a leaderboard and
**seasons are handled off-chain**. **Points have no monetary value** and are not a token. `[proven]`

### Is there a token or LP or Uniswap listing?

**No.** No ERC-20, no liquidity pool, no Uniswap. `[proven]`

### What chain is this?

**Robinhood Chain** (Arbitrum Orbit L2), chainId `4663`, gas in ETH. `[proven]`

### Is it audited?

An **internal** audit found no critical/high steal/free-mint issues, and the test suite passes
(**418/418**). A
**formal external audit** and the **Safe handover** are planned. See
[Security & ownership](security-and-ownership.md).

### Is it deployed to mainnet yet?

Not yet. The **t8** rehearsal is live on the Robinhood Chain **testnet** (`chainId 46630`); the
**mainnet `4663`** deployment (**t9**) is **pending**, and **mainnet addresses are not published**.
`[proven]`

### Is it safe to use?

It is a live game on Robinhood Chain with real mechanics. Only use funds you can afford to lose. Never share your
seed phrase. See the [Legal disclaimer](legal-disclaimer.md).

### Who runs it?

The team, through an on-chain `Config` contract, targeted for control by a **Safe 2-of-3** multisig.
There is no central database deciding your cards — the chain does. `[proven]`

### I found a bug. What do I do?

Report it privately via the [Official links](official-links.md). Do not exploit it. Responsible
disclosure helps everyone.

---

## Still curious?

- [Getting started](../introduction/getting-started.md)
- [Glossary](glossary.md)
- [For AI agents](for-ai-agents.md)
