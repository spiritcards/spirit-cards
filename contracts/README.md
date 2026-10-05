# Spirit Cards — Contracts (Foundry)

Solidity core for [Spirit Cards](../README.md): PoW mining, merge, staking,
PvP battle, points, packs.

## Layout

```
src/        Config, SpiritCards, ChipToken, StakeVault, Battle, Points, Packs, ReentrancyGuard
test/       12 test files — 418 tests (edge cases, fuzz, invariants)
script/     Deploy.s.sol (full stack), PumpPool.s.sol (keeper)
broadcast/  Deployment records per chain (public tx data)
lib/        forge-std (vendored — no submodules needed)
```

## Build & test

```bash
forge build
forge test        # 418 tests, all green at the live stack (t9)
```

RPC endpoints for `forge script --rpc-url` are configured in `foundry.toml`
(`robinhood` = mainnet 4663, `robinhood_testnet` = 46630).

## Deploy

`script/Deploy.s.sol` deploys and wires the whole stack. Env:

| Var | Meaning |
|---|---|
| `PRIVATE_KEY` | deployer key (**never commit**; local anvil or a throwaway test key) |
| `TREASURY` | treasury / future owner (a Safe in production) |
| `BASE_URI` | token metadata base (e.g. `https://spiritcards.fun/api/meta/`) |
| `CONTRACT_URI` | EIP-7572 contract-level metadata (data: URI or https) |

The script deploys with the deployer as interim owner; production handover to a
multisig is a separate owner-tx (`nominateOwner` → `acceptOwnership`).

## Notes

- The core is intentionally **tunable** (all key parameters live in `Config`, guarded
  by a 2-step owner). Security invariants are documented in [`ALL_MECHANICS.md`](../ALL_MECHANICS.md).
- Live mainnet addresses: see the root [`README.md`](../README.md).
