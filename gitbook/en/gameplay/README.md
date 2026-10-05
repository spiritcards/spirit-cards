# Gameplay (榜 POINTS)

Beyond cards and ETH, Spirit Cards rewards **playing the game** with **activity points**. Points are a
pure game score: they are not a token, they are not tradeable, and they have **no monetary value**.
They exist to create a **leaderboard** and, over time, **seasonal competition**.

> [!IMPORTANT]
> Points (榜 / 积分) are a **score**, not money and not a reward claim. They cannot be redeemed, sold, or
> exchanged for anything, and they confer no right to any payout. Treat them as a high-score table.

---

## How you earn points

Points are awarded **on-chain**, by the module that performs the action. Defaults: `[proven]`

| Action | Points | Parameter | Awarded by |
|---|---|---|---|
| **Mine** a card | **1** | `pointsMine` | `SpiritCards.mine` |
| **Merge** (successful) | **2** | `pointsMerge` | `SpiritCards.mergeBurn` |
| **Stake** a card | **2** | `pointsStake` | `StakeVault.stake` / `stakeBatch` |
| **Win** a duel | **3** | `pointsPvpWin` | `Battle._settle` |

Points are recorded by the `Points` contract, whose owner is **always `Config.owner()`** — so ownership
follows the config's owner (the deployment address, later the Safe). `[proven]`

> [!NOTE]
> Batch staking awards `pointsStake × N` (2 per card). Mining/merging/battling award per action.
> `[proven]`

---

## The `Points` contract

```solidity
contract Points {
    Config public immutable config;
    mapping(address => bool) public authorized;
    mapping(address => uint256) public points;

    function owner() public view returns (address) { return config.owner(); }

    function addPoints(address user, uint256 amount, bytes32 reason) external {
        require(authorized[msg.sender] || msg.sender == config.owner(), "NOT_AUTH");
        points[user] += amount;
        emit PointsAdded(user, amount, reason);
    }
}
```

`[proven]`

- Only **authorized modules** (SpiritCards, StakeVault, Battle) — or the owner — can add points.
- Each award emits `PointsAdded(user, amount, reason)` with a reason tag such as `MINE`, `MERGE`,
  `STAKE`, `PVP_WIN`.
- The leaderboard is simply the `points[address]` mapping, **readable on-chain**. `[proven]`

---

## Why on-chain points

Putting points on-chain means **anyone can read and verify** the leaderboard from the contract, without
trusting a database:

```solidity
points.points(user)     // an address's score
// iterate holders client-side, or index PointsAdded events
```

`[proven]` for the mapping; `[assumed]` that a public indexer builds the sorted view.

---

## Pages in this section

| Page | Covers |
|---|---|
| **[Points & leaderboard](points-and-leaderboard.md)** | The scoring rules, the contract, how to read the board, anti-abuse notes |
| **[Seasons](seasons.md)** | How seasons work (off-chain snapshots), prizes and fairness |

---

## Points ≠ money

To be explicit, because this matters for compliance and honesty:

- Points are **not** ERC-20 tokens and are **not** transferable.
- Points have **no monetary value** and **no redemption path**.
- Points do **not** entitle the holder to any share of revenue, any card, or any payout.
- Seasonal prizes, if any, are discretionary and are **not** an entitlement. `[assumed]` where prizes are
  mentioned; the "no monetary value" property is `[proven]` (points live only as an on-chain integer).

See the [Legal disclaimer](../project/legal-disclaimer.md).
