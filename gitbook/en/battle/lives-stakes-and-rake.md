# Lives, stakes & rake

This page covers what happens to the **cards** and the **money** after a duel resolves: lives and burn,
escrow/release, the rake split, and the event trail.

---

## Lives (❤ × 3)

Every card starts with **3 lives** (`config.lives()` default). `[proven]`

- **The loser** of a duel loses **1 life**.
- While lives remain, the card is **alive** and can fight again.
- At **0 lives** the card is **burned** — a real supply sink. `[proven]`

### Lives bookkeeping

```solidity
mapping(uint256 => uint256) public livesOf;  // 0 => default (config.lives())
mapping(uint256 => bool)    public burned;   // true once the card ran out of lives

function lives(uint256 card) public view returns (uint256) {
    if (burned[card]) return 0;               // dead card reports 0
    uint256 l = livesOf[card];
    return l == 0 ? config.lives() : l;       // 0 means "never damaged" → default
}
```

`[proven]`

### The life-loss path

```solidity
function _loseLife(uint256 card, address owner, bool fromVault) internal {
    uint256 l = lives(card);
    l -= 1;
    if (l == 0) {
        _kill(card, owner, fromVault);        // 0 → burn
    } else {
        livesOf[card] = l;                    // record the reduced count
        _release(card, owner, fromVault);     // return the card to its owner
    }
}
```

`[proven]`

> [!NOTE]
> **The winner never loses a life.** Only the loser is marked. A card that wins always stays at its
> current life count.

### Burn

When a card hits 0 lives: `[proven]`

- If the dead card was **wallet-owned**: `spc.burnCard(card)` (the Battle contract holds it in escrow
  and burns it).
- If the dead card was **staked**: `vault.killInBattle(card)` — which settles the staker's pending
  rewards, clears the stake, and burns the card.
- `livesOf[card] = 0`, `burned[card] = true`, and `CardBurned(card, owner)` is emitted.

---

## Escrow & release

Cards move through the duel in one of two custody modes. The helper functions make this explicit:

```solidity
function _escrow(uint256 card, address who) internal returns (bool fromVault) {
    if (spc.ownerOf(card) == who) { spc.transferFrom(who, address(this), card); return false; }
    if (_stakedBy(card, who))     { vault.lockForBattle(card, who);             return true;  }
    revert("NOT_OWNER");
}

function _release(uint256 card, address holder, bool fromVault) internal {
    if (fromVault) vault.unlockFromBattle(card);              // stays staked
    else           spc.transferFrom(address(this), holder, card);
}
```

`[proven]`

| | Wallet-owned card | Staked card |
|---|---|---|
| **Escrow** | Transferred to Battle | `vault.lockForBattle` (stays in vault) |
| **Release (survived)** | Transferred back to owner | `unlockFromBattle` (stays staked) |
| **Kill (0 lives)** | `spc.burnCard` | `vault.killInBattle` |
| **NFT approve needed?** | Yes (Battle pulls the card) | **No** — the vault holds custody |

---

## A staked card can fight (and keeps earning)

This is a first-class feature, not an edge case: `[proven]`

- The Battle module is authorized on the vault (`vault.setBattle(battle)`).
- When a staked card is dueled, the vault **locks** it (`inBattle = true`) but keeps custody and keeps
  its **weight** in `totalWeight` — so the staker **keeps earning dividends** during and after the
  fight.
- On survival, the card is unlocked and remains staked.
- On death, `killInBattle` pays the staker's **pending rewards** and closes the position.

> [!TIP]
> This is why staking and battling are not mutually exclusive: you can lock a card for a share of the
> pool and still send it into duels. Just remember a loss costs a life.

See [Staking & rewards](../economy/staking-and-rewards.md) for the vault side.

---

## The stake and the pot

- Both sides stake the **same** amount (`acceptDuel` requires `msg.value == d.stake`). `[proven]`
- The **pot** = `stake × 2`. `[proven]`
- The **winner** receives `pot − rake`. `[proven]`
- The **stake must be > 0** (`createDuel` requires `stake > 0`). `[proven]`

---

## The rake

```solidity
uint256 pot  = d.stake * 2;
uint256 rake = (pot * config.pvpRakeBps()) / 10000;   // 10%
...
uint256 payout = pot - rake;                          // to the winner
```

`[proven]`

Rake defaults to **10% of the pot** (`pvpRakeBps = 1000`). It is split:

```solidity
function _payRake(uint256 rake) internal {
    if (rake == 0) return;
    uint256 toPool  = (rake * config.rakeToPoolBps()) / 10000; // 30%
    uint256 toHouse = rake - toPool;                           // 70%
    if (toPool  > 0) spc.addToPool{value: toPool}();
    if (toHouse > 0) payable(config.treasury()).call{value: toHouse}("");
}
```

`[proven]`

| Rake share | Destination | Parameter |
|---|---|---|
| **70%** | **Treasury** | remainder |
| **30%** | **Staker pool** (via `addToPool`) | `rakeToPoolBps = 3000` |

> [!NOTE]
> The rake is **external revenue** — it comes from players, not from mint fees — and 30% of it feeds the
> staker pool. Because a duel is **zero-sum between players plus the rake**, PvP is **not** a Ponzi: no
> money is created; a slice of the wagered money funds the pool and treasury.

### Rake example (stake = 0.01 ETH)

| Item | Amount |
|---|---|
| Each stake | 0.010000 ETH |
| Pot | 0.020000 ETH |
| Rake (10%) | 0.002000 ETH |
| → Treasury (70%) | 0.001400 ETH |
| → Staker pool (30%) | 0.000600 ETH |
| **Winner payout** | **0.018000 ETH** |

`[assumed]` — arithmetic follows directly from the defaults.

---

## The settlement sequence

In `_settle` (called by `acceptDuel`), the order is: `[proven]`

1. Emit `DuelDetail(id, elA, elB, skA, skB, aWins)`.
2. Compute `pot` and `rake`; determine `winner`, `winCard`, `loseCard`.
3. Record `wins[winCard]++`, `losses[loseCard]++`.
4. `_payRake(rake)` — split rake to pool + treasury.
5. `_release(winCard, winner, …)` — return the winner's card.
6. `_loseLife(loseCard, loser, …)` — decrement life; burn if it hits 0; else release the card.
7. Award points to the winner (`pointsPvpWin`, default 3).
8. Pay the winner `pot − rake`.
9. Emit `DuelResolved(id, winner, winCard, loseCard, payout, rake)`.

The function is `nonReentrant`, and external ETH sends use `.call` with a success check.

---

## What a player can lose

| In a duel you risk | Outcome |
|---|---|
| Your **stake** (ETH) | Lost if you lose |
| **1 life** of your card | Lost if you lose; at 0 → card **burned** |
| The card itself | Permanently, if it had 1 life left and lost |

> [!WARNING]
> Battle can cost you **real ETH and a real card**. It is a wager, not a sure thing. There is no
> guaranteed income from battle; over time players as a group pay the rake.

---

## Reading it on-chain

```solidity
battle.lives(card)       // remaining lives
battle.burned(card)      // true if dead
battle.wins(card)        // PvP wins on this card
battle.losses(card)      // PvP losses
config.lives()           // 3
config.pvpRakeBps()      // 1000
config.rakeToPoolBps()   // 3000
config.treasury()        // rake destination (70%)
```

`[proven]`

---

## Next

- **[Worked examples](worked-examples.md)**
- **[Staking & rewards](../economy/staking-and-rewards.md)**
- **[Revenue split & referrals](../economy/revenue-split-and-referrals.md)**
