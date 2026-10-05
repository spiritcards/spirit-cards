# Contracts & addresses

The canonical source of truth for addresses is the project's `ops/ADDRESSES.md`. This page mirrors the
current (**t8**) **rehearsal** deployment and explains each contract's role.

> [!WARNING]
> Always verify an address against the official source before sending funds. The addresses below are the
> **current rehearsal deployment on the Robinhood Chain testnet (chainId `46630`)**, deployed
> **2026-10-04** (**t8**). The stack is **not** deployed to mainnet yet — **mainnet (`4663`) addresses
> are not published.** Do not send mainnet funds to these addresses.

---

## The seven contracts

| Contract | Role | Standard |
|---|---|---|
| **`Config`** | Central tunable parameters + ownership + treasury + pause | — |
| **`SpiritCards`** (`SPC`) | Core NFT: PoW mining, merge, price, revenue split, royalty | ERC-721 + ERC-2981 |
| **`ChipToken`** | The chip consumable (mint discount) | ERC-1155 |
| **`StakeVault`** | Staking tiers, reward pool, staked cards, battle locks | — |
| **`Battle`** | PvP duels: escrow, resolution, lives, rake | — |
| **`Points`** | Activity points + leaderboard | — |
| **`Packs`** | Pack purchases (5/10/25/50/100) | — |

`[proven]`

---

## Roles and wiring

| Relationship | Value / check |
|---|---|
| `SpiritCards.config` | → `Config` |
| `SpiritCards.chip` | → `ChipToken` |
| `SpiritCards.vault` | → `StakeVault` (destination of `pumpPool`) |
| `SpiritCards.packMinter` | → `Packs` |
| `SpiritCards.masterRef` | deployer (rehearsal) |
| `StakeVault.nft` | → `SpiritCards` |
| `StakeVault.battle` | → `Battle` (authorized to lock staked cards) |
| `Battle.vault` | → `StakeVault` |
| `Battle.poc` | → `SpiritCards` |
| `ChipToken.minter` | → `SpiritCards` |
| `ChipToken.owner` | → Safe |
| `Points.owner()` | → `Config.owner()` (dynamic) |

`[proven]` — these links are verified on the deployment.

---

## Deployment — Robinhood Chain (testnet rehearsal)

Deployed **2026-10-04** (**t8** rehearsal, **testnet** `chainId 46630`; the on-chain rebrand to
**Spirit Cards** / `SPC` shipped in this stack). Battle v2: elements + skills + variance; master‑ref 3% +
referrer 7%; PvP rake 70% treasury / 30% pool; difficulty +0.33 bit/era; `eraSize = 1111`;
`masterRef` = deployer. Mainnet deployment (**t9**) is pending. `[proven]`

| Contract / role | Address |
|---|---|
| **Safe 2-of-3** | `0x7AC43F96021C50dC057F2F5f6fc5bAa02D4aD912` |
| **Config** | `0x09a24a40210BCed6e62794862175390c229Aa9b1` |
| **ChipToken** (ERC-1155) | `0x596FA37213781f08fD33ad5c0B7A79684852Ed01` |
| **SpiritCards** | `0xAb4cCECaC61Be7bEc6389FF3A215E804E1A1cD46` |
| **StakeVault** | `0x877E2df6691bCb1f4EECf999444B08711c89e0f8` |
| **Battle** | `0x72382D2e24bbEB1F89DcCF4aB8F094a7b56f54e6` |
| **Points** | `0x302Af8502FCa4123A715b91D3f913EAa240eFe49` |
| **Packs** | `0x3FDF852F2E0a0c3E934Bd03A00392f657ceb9Bb0` |

**Verified on-chain `[proven]`:** `SpiritCards.vault()` = StakeVault · `Battle.vault()` = StakeVault ·
`StakeVault.battle()` = Battle · `ChipToken.owner()` = Safe · `ChipToken.minter()` = SpiritCards ·
`Points.owner()` = `Config.owner()` · `Config.treasury()` = Safe · `Packs.poc()` = SpiritCards ·
`SpiritCards.packMinter()` = Packs · `SpiritCards.masterRef()` = deployer.

### t8 parameters

| Parameter | Value |
|---|---|
| `eraSize` | 1111 |
| `baseBits` | 20 |
| `bitsStepX100` | 33 |
| `eraPrice` | 0.00037 ETH |
| `priceStepBps` | 2500 |
| `maxSupply` | 8888 |
| Split (`pool/referral/house/reserve`) | 6000 / 1000 / 3000 / 0 |
| `pvpRakeBps` | 1000 |
| `rakeToPoolBps` | 3000 |
| `masterRefBps` | 300 |
| `typeAdvBps` | 2000 |
| `atkVarianceBps` | 4000 |
| `lives` | 3 |

`[proven]`

---

## Chain parameters

| Property | Value |
|---|---|
| Network | Robinhood Chain (Arbitrum Orbit L2) |
| Mainnet chainId | `4663` (target) |
| Testnet chainId | `46630` (current t8 rehearsal) |
| Gas token | ETH |
| Block time | ~100–250 ms |
| RPC (mainnet) | `https://rpc.mainnet.chain.robinhood.com` |

`[proven]`

---

## Project wallets

Separate from team/personal wallets. Private keys live in **KeePass**, never in the repo. `[proven]`

| Name | Purpose |
|---|---|
| `deployer` | Contract deployment (ownership → Safe later) |
| `treasury` | Team + marketing (from the split) |
| `pool` | Staker dividends (later → the vault) |
| `referral` | Referral fund |
| `house-arena` | House arena (bots, liquidity) |
| `ops-hot` | Operational gas |
| `market` | Marketplace / secondary revenue (if needed) |

Project wallets and personal wallets are **distinct sets**. `[proven]`

---

## Reading it on-chain

```solidity
Config.owner()            Config.treasury()        Config.paused()
SpiritCards.name()        SpiritCards.symbol()     SpiritCards.totalMinted()
SpiritCards.currentPrice() SpiritCards.requiredBits()
Battle.duelCount()        StakeVault.totalWeight() Packs.priceFor(i)
```

`[proven]`

---

## Next

- **[Security & ownership](security-and-ownership.md)**
- **[Official links](official-links.md)**
