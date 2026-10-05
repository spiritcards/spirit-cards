# Spirit Cards (SPC)

> Collectible creature cards **mined by real Proof-of-Work** on **Robinhood Chain**
> (mainnet `4663`, gas in ETH). Loop: **⛏ MINE → ⚒ MERGE → ⚔ BATTLE → 🔒 STAKE → 🏆 POINTS**.

Spirit Cards is an on-chain collectible card game. You mine a keccak-256 nonce in your
browser (or with the CLI miner); the winning hash becomes the card's **seed** — traits,
element, skills and battle stats are all derived deterministically from it. Cards are
consumables in a game loop: merge 2→1 for a forged card, stake for pool dividends,
duel other players in PvP escrow battles.

- **Site:** https://spiritcards.fun
- **Docs:** [EN](https://spirit-cards.gitbook.io/spirit-cards-docs) · [中文](https://spirit-cards.gitbook.io/spirit-cards-docs-zh)
- **Marketplace:** [OpenSea — spirit-cards](https://opensea.io/collection/spirit-cards)
- **X:** [@spirit_card](https://x.com/spirit_card) · **Telegram:** [t.me/spirit_cards_game](https://t.me/spirit_cards_game)

## How the PoW mint works

`work = keccak256(abi.encodePacked(chainId, SpiritCards, miner, nonce))` — a mint is valid
when `leadingZeroBits(work) ≥ baseBits` (20 at launch, **+0.33 bit per price era**; no
ratchet — difficulty is deliberately not punishing). The winning nonce is submitted with
`mine(nonce, useChip)` at the current card price; the contract verifies the hash on-chain
and emits `Mined(miner, tokenId, nonce, work, bits, paid)` — that `work` value is the card's seed.

- Card price: starts at **0.00037 ETH (~$1)** and rises **+25% per era** (era = 1111 paid mints).
- Epoch cap 1000 mints/hour, 45s per-wallet cooldown, anti-drain through price/supply — not difficulty.
- Everything tunable lives in `Config` (owned by a 2-of-3 Safe) — nothing in the core is immutable by design.

## Deployed contracts — Robinhood Chain mainnet (chainId 4663)

| Contract | Address |
|---|---|
| SpiritCards (core, ERC-721) | `0x0997DB0BEa2c1278063ebBEc0d1cdbecE7B6F021` |
| Config | `0x678629B80ab8A3Bc049e0FaBca7Aa5De826c8819` |
| ChipToken (ERC-1155) | `0x1311fb3cfEd5F2163110De0758a6a2A6B9A4aC77` |
| StakeVault | `0x633Fb0B37E7B46Ef877Ec8FB4e2dAadf9deb7E87` |
| Battle | `0xD7123294A5841B71f51FFf4487b01FfE3B157cdC` |
| Points | `0x1791DF764AFdE79a3f190177FA871183d164fb6C` |
| Packs | `0xEBF950Cd7E048Cd36DcEF959a966A102AEA6C98F` |
| Safe (owner / treasury, 2-of-3) | `0x4e85fc9f1b825b51260B07B5936514D5a1c65B04` |

The frontend's canonical set lives in `webapp/lib/canonical.ts` (single source of truth;
`npm run check:addresses` fails on any stale address drifting into an active file).

## Repository layout

```
contracts/   Foundry project — Solidity core (8 contracts), 418 tests, deploy scripts, broadcasts
webapp/      Next.js 15 site — browser PoW miner, card render from seed, all game sections
miner/       CLI miner + hashrate measurement (pure-JS keccak; byte-exact vs the on-chain event)
gitbook/     Public docs sources (EN + 中文) — rendered by spirit-cards-docs
docs/        Repo documentation (agents, MCP, site)
```

## Quick start

```bash
# contracts
cd contracts && forge test          # 418 tests

# site
cd webapp && npm install && npm run dev    # http://localhost:3000
npm run build                              # production build
npm run check:addresses                    # address-drift gate

# CLI miner
cd miner && node mine.mjs --help           # benchmark: node measure.mjs
```

## Security

- Report vulnerabilities privately — see [`SECURITY.md`](SECURITY.md).
- The core is **tunable** (Config under a 2-of-3 Safe) and fully auditable on-chain.
- **Independent external audit: not conducted.** An internal security review was performed;
  known design risks (VRF-less battle randomness settlement, receiver-hook-free transfers)
  are documented in [`ALL_MECHANICS.md`](ALL_MECHANICS.md). Interact at your own risk.

## Disclaimer

Spirit Cards is a **collectible game**, not an investment product. Nothing in this
repository or on the site is financial advice, and no returns are promised or guaranteed.
All "dividends" are distributions of real, collected protocol fees — never emissions.

## License

MIT — see [`LICENSE`](LICENSE).
