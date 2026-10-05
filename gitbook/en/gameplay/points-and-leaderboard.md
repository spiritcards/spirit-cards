# Points & leaderboard

This page details the scoring system and how the leaderboard is read. Points are a **game score**, not
money.

---

## Scoring rules

Points are integer values kept in the `Points` contract and awarded by authorized modules:

| Action | Points | `Config` key | Default | Reason tag |
|---|---|---|---|---|
| Mine a card | 1 | `pointsMine` | 1 | `MINE` |
| Successful merge | 2 | `pointsMerge` | 2 | `MERGE` |
| Stake a card | 2 | `pointsStake` | 2 | `STAKE` |
| Win a PvP duel | 3 | `pointsPvpWin` | 3 | `PVP_WIN` |

`[proven]`

### Notes

- **Merge** awards points only when a **child is minted**; a **dud** (7% chance) awards none (no child).
  `[proven]`
- **Stake** in a batch awards **2 × number of cards**. `[proven]`
- **PvP win** points go to the **winner** only. The loser earns none. `[proven]`
- Points are awarded **per action** — there is no decay and no cap on the on-chain counter.

---

## The `Points` contract in detail

```solidity
function addPoints(address user, uint256 amount, bytes32 reason) external {
    require(authorized[msg.sender] || msg.sender == config.owner(), "NOT_AUTH");
    points[user] += amount;
    emit PointsAdded(user, amount, reason);
}
```

`[proven]`

| Field / function | Meaning |
|---|---|
| `points[user]` | The address's total score (public mapping) |
| `authorized[module]` | Which modules may award points |
| `owner()` | Always equals `config.owner()` (dynamic, not a snapshot) |
| `setAuthorized(who, ok)` | Owner-only; grants/revokes a module |
| `PointsAdded(user, amount, reason)` | Event per award |

> [!NOTE]
> `Points.owner()` is **dynamic** — it returns `config.owner()`. So when `Config` ownership is handed to
> the Safe multisig, the Points admin **moves with it**. There is no separate stale admin. `[proven]`

---

## Who awards points

| Module | Awards | Via |
|---|---|---|
| `SpiritCards` | mine, merge | `points.addPoints(...)` in `mine` / `mergeBurn` |
| `StakeVault` | stake | `points.addPoints(...)` in `stake` / `stakeBatch` |
| `Battle` | PvP win | `points.addPoints(winner, pointsPvpWin, "PVP_WIN")` |

All three are wired with `setPointsContract(address)`. Hooks are **null-safe**: if the Points contract
is not set, the action still works and simply awards no points. `[proven]`

---

## Reading the leaderboard

Because `points` is a public mapping, the leaderboard is **on-chain data**:

```solidity
points.points(user)        // one address's score
```

To build a sorted board you index `PointsAdded` events (or track known addresses) client-side. There is
no on-chain sorting; the contract stores raw totals. `[proven]` for the mapping; `[assumed]` for the
event-indexing approach to render a ranked list.

### Example query

```
For each address of interest:
  score = points.points(address)

Leaderboard = addresses sorted by score descending.
```

`[proven]`

---

## What points are *not*

- **Not a token.** No transfer, no approve, no balance in ERC-20 terms.
- **Not tradeable** and **not redeemable**.
- **No monetary value.**
- **Not an entitlement** to any future payout.

`[proven]` — points exist only as an on-chain `uint256` counter.

---

## Anti-abuse (design notes)

Points are cheap to earn (mining is the cheapest), so the design leans on **cost** rather than
policing: `[assumed]`

- Mining costs ETH and is throttled by **cooldown + epoch cap**, so farming points by mining has a real
  cost.
- Merging costs a **fee** and burns cards; staking **locks** cards; PvP wins require winning (and risking
  ETH).
- Points are **off-chain-scored for seasons**, so a snapshot can discount obviously mechanical behavior.

None of this is a guarantee against farming — points have no value, so the incentive to farm is limited
to bragging rights and seasonal standing.

---

## Next

- **[Seasons](seasons.md)**
- **[Gameplay overview](README.md)**
- **[Battle → Lives, stakes & rake](../battle/lives-stakes-and-rake.md)** — where PvP points come from
