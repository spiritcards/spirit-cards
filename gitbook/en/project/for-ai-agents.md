# For AI agents

A **machine-readable** summary of Spirit Cards mechanics, intended for agents, indexers, and
bot developers. Values are the **current (t8, testnet `46630`) defaults** unless noted. All formulas are
as implemented in the contracts.

> [!IMPORTANT]
> This is a **game**. No yield is promised. Points have **no monetary value**. Do not present any of
> these numbers as an investment, an APY, or a guaranteed return.

---

## Network

```json
{
  "chain": "Robinhood Chain (Arbitrum Orbit L2)",
  "mainnet_chainId": 4663,
  "testnet_chainId": 46630,
  "current_deployment": "t8 (testnet 46630, 2026-10-04)",
  "gas_token": "ETH",
  "block_time_ms": [100, 250],
  "rpc_mainnet": "https://rpc.mainnet.chain.robinhood.com"
}
```

`[proven]`

---

## Contracts (t8)

```json
{
  "safe_2of3":   "0x7AC43F96021C50dC057F2F5f6fc5bAa02D4aD912",
  "Config":      "0x09a24a40210BCed6e62794862175390c229Aa9b1",
  "ChipToken":   "0x596FA37213781f08fD33ad5c0B7A79684852Ed01",
  "SpiritCards": "0xAb4cCECaC61Be7bEc6389FF3A215E804E1A1cD46",
  "StakeVault":  "0x877E2df6691bCb1f4EECf999444B08711c89e0f8",
  "Battle":      "0x72382D2e24bbEB1F89DcCF4aB8F094a7b56f54e6",
  "Points":      "0x302Af8502FCa4123A715b91D3f913EAa240eFe49",
  "Packs":       "0x3FDF852F2E0a0c3E934Bd03A00392f657ceb9Bb0"
}
```

`[proven]`

---

## Core constants (Config defaults)

```json
{
  "baseBits": 20,
  "bitsStepX100": 33,
  "mineCooldown": 45,
  "epochCap": 1000,
  "epochLength": 3600,
  "eraPrice_wei": "370000000000000",
  "priceStepBps": 2500,
  "eraSize": 1111,
  "chipDiscountBps": 3000,
  "mergeFee_wei": "20000000000000",
  "mergeFailBps": 700,
  "splitBps": { "pool": 6000, "referral": 1000, "house": 3000, "reserve": 0 },
  "maxSupply": 8888,
  "lives": 3,
  "pvpRakeBps": 1000,
  "rakeToPoolBps": 3000,
  "typeAdvBps": 2000,
  "atkVarianceBps": 4000,
  "masterRefBps": 300,
  "royaltyBps": 500,
  "tierLock_seconds": [0, 604800, 2592000, 7776000, 15552000, 31536000],
  "tierWeightX1000": [1000, 5000, 10000, 20000, 30000, 40000],
  "points": { "mine": 1, "merge": 2, "stake": 2, "pvpWin": 3 }
}
```

`[proven]`

---

## Formulas

### Mining

```
work = keccak256(abi.encodePacked(chainId, SpiritCards, miner, nonce))
valid ⇔ leadingZeroBits(work) >= requiredBits()
requiredBits = baseBits + floor(era * bitsStepX100 / 100); era = paidMinted / eraSize
seed = keccak256(abi.encodePacked(block.prevrandao, miner, nonce, id))
nonceUsed[miner][nonce] = true   // one-time
```

`[proven]`

### Pricing

```
era = paidMinted / eraSize
price(era) = eraPrice * (1 + priceStepBps/10000)^era   // eraPrice * 1.25^era
```

Ladder (ETH): `0.00037, 0.0004625, 0.000578125, 0.00072265625, 0.0009033203125, 0.001129150390625, 0.00141143798828125, 0.0017642974853515625`. Total ≈ **8.16 ETH**. `[proven]`

### Card profile (from seed)

```
rarity  = (s >> 248) % 6                                  // 0..5
atk     = 8  + ((s >> 240) & 0xFF) % 20 + rarity*4        // 8..27  + rarity*4
def     = 4  + ((s >> 232) & 0xFF) % 16 + rarity*3        // 4..19  + rarity*3
hp      = 50 + ((s >> 224) & 0xFF) % 100 + rarity*15      // 50..149 + rarity*15
element = (s >> 216) & 0x03                               // 0..3
skill   = (s >> 208) % 6                                  // 0..5
```

`[proven]`

### Merge

```
s = keccak256(seedOf[a], seedOf[b], block.prevrandao, msg.sender)
burn a, b; burned += 2
roll = keccak256(s, "DUD") % 10000
child = (roll < mergeFailBps) ? DUD(id 0) : mint(id = 10_000_000 + ++forgeCounter)
forged child seed = s
```

`[proven]`

### Battle resolution

```
rng0 = keccak256(seedOf[a], seedOf[b], duelId, block.prevrandao, Battle)
atk_i = roll(atk_i)                       // factor ∈ [0.60, 1.40]
mltA, mltB = elementMult(elA, elB)        // {+/-20% | neutral}
if Vigor: hp *= 1.20
for round in 0..63:
    rng = keccak256(rng)
    ai = round % 2                         // 0 => A strikes (even rounds)
    d  = strike(atk[ai], def[1-ai], mlt[ai], sk[ai], sk[1-ai], rng)
    hp[1-ai] -= d; if 0 => winner = (ai == 0)
tiebreak: compare hp[0]*startHp[1] vs hp[1]*startHp[0]; final tie -> (rng&1)==0
```

`strike`:
```
effAtk = atk * elementMult / 10000
def'   = (attacker Pierce) ? 0 : def
base   = max(1, effAtk - def'/2)
if Precision: base = base*115/100
if Crit and rng%5==0: base *= 2
if defender Shield: base = base*70/100
damage = max(1, base)
```

`[proven]`

### Elements

```
beats(x,y) ⇔ y == (x+1) % 4
Ember(0) > Stone(1) > Gale(2) > Tide(3) > Ember(0)
```

`[proven]`

### Settlement

```
pot  = 2 * stake
rake = pot * pvpRakeBps / 10000            // 10%
toPool  = rake * rakeToPoolBps / 10000     // 30%
toHouse = rake - toPool                    // 70% -> treasury
winner payout = pot - rake
loser: lives -= 1; if 0 -> burn
wins[winCard] += 1; losses[loseCard] += 1
points.addPoints(winner, pointsPvpWin, "PVP_WIN")
```

`[proven]`

### Revenue split (mint/merge/pack)

```
toPool     = amount * poolBps / 10000      // 60%
toReferral = amount * referralBps / 10000  // 10%
toHouse    = amount * houseBps / 10000     // 30%
toReserve  = amount - others               // 0%
inside referral fund:
  toMaster = min(amount * masterRefBps / 10000, toReferral)   // 3%
  toReferrer = toReferral - toMaster                          // 7%
```

`[proven]`

### Packs

```
size        = [5, 10, 25, 50, 100]
discountBps = [300, 600, 1200, 2000, 3000]
packPriceBps = 20000                        // ×2 vs currentPrice()
unit = currentPrice() * packPriceBps / 10000
base = unit * size[i]
priceFor(i) = base - base*discountBps[i]/10000
buyPack(i) -> spc.mintPack(buyer, size[i]); revenue via collectRevenue -> split
pack seeds: keccak256(block.prevrandao, buyer, id, index)
```

`[proven]`

---

## Events

```
Mined(miner, tokenId, nonce, work, bits, paid)
Merged(a, b, child, fee)                 // child == 0 -> dud
DuelCreated(id, a, cardA, stake)
DuelDetail(id, elA, elB, skA, skB, aWins)
DuelResolved(id, winner, winCard, loseCard, payout, rake)
DuelCancelled(id, a, cardA, stake)
CardBurned(card, owner)
Staked(user, tokenId, tier, weight)
RewardsNotified(amount)
PoolPumped(vault, amount)
PointsAdded(user, amount, reason)
ConfigChanged(key, oldValue, newValue)
PackOpened(buyer, size, firstId, paid, discountBps)
```

`[proven]`

---

## Do / Don't for agents

**Do:**

- Read `seedOf`, `profileOf`, `currentPrice`, `requiredBits` before acting.
- Reproduce `work` exactly as `keccak256(chainId ‖ contract ‖ miner ‖ nonce)`.
- Treat battle as **probabilistic** (elements + skills + variance).
- Respect `maxSupply`, cooldown, epoch cap, and the pause switch.

**Don't:**

- Present any figure as an APY, yield, or guaranteed return.
- Claim points have value.
- Assume a fixed battle outcome from stats alone.
- Share or request seed phrases / private keys.

---

## Full parameter disclosure

Every tunable is a public getter on `Config`. To enumerate:

```solidity
Config.poolBps() Config.referralBps() Config.houseBps() Config.reserveBps()
Config.masterRefBps() Config.royaltyBps() Config.maxSupply() Config.lives()
Config.pvpRakeBps() Config.rakeToPoolBps() Config.typeAdvBps() Config.atkVarianceBps()
Config.baseBits() Config.bitsStepX100() Config.mineCooldown() Config.epochCap() Config.epochLength()
Config.eraPrice() Config.priceStepBps() Config.eraSize() Config.chipDiscountBps()
Config.mergeFee() Config.mergeFailBps() Config.treasury()
```

`[proven]`

---

## MCP (Model Context Protocol)

A **read-only** MCP server is exposed over **Streamable HTTP** (stateless), so LLM clients
(Claude Desktop, Cursor, …) can query live project data directly. It is **anonymous**: no API
keys, no accounts, no wallet, and no writes.

Endpoint: `POST /api/mcp`

### Tools

| Tool | Returns |
|---|---|
| `get_project_info` | What the game is: the loop, chain, links, collection/economy basics, and how to start. |
| `get_collection_stats` | Collection-wide totals: supply, mint price, difficulty, cooldown, counters, paused flag. |
| `get_card` | Full profile of one token by id: species, element, rarity, HP/ATK/DEF, seed. |
| `verify_nonce` | Recomputes `work` for a `(miner, nonce)` pair and reports whether it meets `requiredBits`. |
| `get_leaderboard` | Activity-points leaderboard, top N wallets. |
| `get_pool` | Staking-pool / dividend status: accrued pool, split shares, vault weight. |
| `find_nonce` | Grinds a valid proof-of-work nonce for a miner address so it can mint immediately. |
| `get_mining_guide` | Step-by-step guide to start mining, with live difficulty/price/cooldown and the exact mint call. |
| `get_recent_activity` | Recent on-chain activity (mints / pack opens). |

### Prompts

| Prompt | Purpose |
|---|---|
| `project_overview` | Introduce Spirit Cards to a newcomer. |
| `start_mining` | Walk a user through minting: guide + a ready-to-use nonce. |

### Client config

```
// Claude Desktop / Cursor — streamable HTTP
{ "mcpServers": { "spirit-cards": { "url": "https://<site>/api/mcp" } } }

// stdio-only clients
{ "mcpServers": { "spirit-cards": { "command": "npx", "args": ["-y", "mcp-remote", "https://<site>/api/mcp"] } } }
```

`[proven]`

---

## Next

- **[Contracts & addresses](contracts-and-addresses.md)**
- **[Battle → Resolution & damage](../battle/resolution-and-damage.md)**
