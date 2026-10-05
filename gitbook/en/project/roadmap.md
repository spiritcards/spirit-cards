# Roadmap

This roadmap is **directional**, not a contract. Items marked `[proven]` are done; `[planned]` are not.

> [!NOTE]
> No roadmap item is a promise. Dates are intentionally omitted — the project ships when a step is
> ready, and the ordering can change.

---

## Done `[proven]`

| Area | What's done |
|---|---|
| Contracts | `Config`, `SpiritCards`, `ChipToken` (ERC-1155), `StakeVault`, `Battle` (v2), `Points`, `Packs` |
| Mining | Fixed-difficulty PoW, cooldown, epoch cap, chips, on-chain seed |
| Merge | 2 → 1 forging with fee and the 7% "dud" |
| Staking | 6 tiers, weights, reward pool, batch ops, fight-while-staked |
| Battle v2 | Elements + skills + per-battle variance, lives, escrow, rake split |
| Points | On-chain activity points + leaderboard |
| Packs | 5/10/25/50/100 with tiered discounts |
| Web app | Next.js 15, production at **spiritcards.fun**, all sections, auto-mining |
| Miner | CLI PoW miner + phone hash-rate benchmark |
| Art | 16 species (8 universal + 8 dragons), deterministic render |
| Test suite | Foundry suite green (**418/418** passing) |
| Deployment | **t8** rehearsal deployed and wired on **testnet** `chainId 46630` (2026-10-04) |
| Rebrand | On-chain rename to **Spirit Cards** (`SPC`) shipped in **t8** (2026-10-04) |
| Domain | **`spiritcards.fun`** live as the primary site (TLS since 2026-10-05) |

---

## Next `[planned]`

| Area | What's next |
|---|---|
| Mainnet | Deploy and publish the full stack to **mainnet `4663`** (**t9**); publish mainnet addresses |
| Ownership | Hand `Config` ownership to the **Safe 2-of-3** |
| Audit | Formal **external** audit |
| Economy | Calibrate pricing/throttles from real usage; tune battle params |
| Battle | UX polish, replay tooling, richer `DuelDetail` surfacing |
| Seasons | Season tooling and off-chain snapshot pipeline for the leaderboard |
| Scale | Performance and cost optimization of the mining/UX paths |

---

## Later / exploratory `[planned]`

- Sponsor-fed pool revenue (external sources beyond fees and rake).
- Additional art/species waves and seasonal cosmetics.
- Richer collection views and provenance tooling.
- Expanded tournament formats around the PvP engine.

> [!WARNING]
> Exploratory items may be dropped. Nothing here implies a token, a yield, or a financial product.
> Points remain non-monetary and no return is promised at any stage.

---

## How to follow progress

Official channels only (see [Official links](official-links.md)):

- **X**: `https://x.com/spirit_card`
- **Telegram**: `https://t.me/spirit_cards_game`
- **GitHub**: `https://github.com/spiritcards`

---

## Principles that don't change

Whatever the phase, these hold: `[proven]` for the mechanism, `[assumed]` for intent.

1. **Mine, don't buy** — PoW is the canonical path.
2. **Deterministic from the seed** — verifiable cards.
3. **Tunable core** — rebalance without migration.
4. **Real fees only** — the pool shares what's actually collected; no guarantees.
5. **No token, no Ponzi** — ETH in, ETH out, zero-sum PvP plus a rake.

---

## Next

- **[For AI agents](for-ai-agents.md)**
- **[FAQ](faq.md)**
- **[Legal disclaimer](legal-disclaimer.md)**
