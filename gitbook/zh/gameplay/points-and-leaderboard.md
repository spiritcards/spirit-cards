# 积分与排行榜

**POINTS（榜）** 是链上**活跃积分**加一张**排行榜**。游戏奖励**活跃度**：挖矿、熔炼、质押、
以及对战胜利。这是「攀比」的驱动引擎——能看见自己排第几，游戏才更有意思。 `[proven]`

---

## 积分规则

| 动作 | 积分（默认） | 参数 |
|---|---|---|
| **MINE**（挖矿） | 1 | `pointsMine` |
| **MERGE**（熔炼） | 2 | `pointsMerge` |
| **STAKE**（质押） | 2 | `pointsStake` |
| **PvP win**（对战胜利） | 3 | `pointsPvpWin` |

积分由授权模块（`SpiritCards`、`StakeVault`、`Battle`）通过 `Points` 合约发放。 `[proven]`

> [!NOTE]
> 批量质押（`stakeBatch`）会按**卡数 × 单卡积分**发放，所以一次押多张卡不会「少给」。 `[proven]`

---

## 存放在哪

- **积分**链上存储于 `Points` 合约（`points[address]`）。 `[proven]`
- **排行榜**从同一合约读取。 `[proven]`
- **赛季**是**链下**的（基于快照）——赛季逻辑不写进合约。 `[proven]`

`Points` 合约发出事件 `PointsAdded(user, amount, reason)`，因此活跃度可通过链上事件审计
（索引器、仪表盘都能读）。 `[proven]`

---

## 如何查看

| 想做的事 | 方法 |
|---|---|
| 查某地址积分 | 读 `Points.points[address]` `[proven]` |
| 查排行榜 | 读 `Points` 合约（前端聚合） `[proven]` |
| 审计积分来源 | 订阅 `PointsAdded(user, amount, reason)` 事件 `[proven]` |

> [!NOTE]
> 排行榜的具体呈现方式（Top N、是否含质押拆分等）由前端实现决定；链上数据是权威来源。 `[assumed]`

---

## 积分 ≠ 钱

> [!WARNING]
> **积分没有货币价值**，不能兑换成钱，也不保证任何奖励。它是**游戏内的活跃度指标**。
> 赛季奖励是皮肤 / 物品，**不是钱**。见 [法律声明](../project/legal-disclaimer.md)。
> `[proven — 设计不变量]`

---

## 参数（可通过 `Config` 调整）

| 键 | 默认 |
|---|---|
| `pointsMine` | 1 |
| `pointsMerge` | 2 |
| `pointsStake` | 2 |
| `pointsPvpWin` | 3 |

各动作的积分权重可由所有者通过 `setPoints` 调整，因此竞争平衡可在**不重新部署**的情况下调整。 `[proven]`

---

## 管理权与移交

`Points` 的所有者**动态跟随** `Config` 的所有者：`Config` 移交到 Safe 后，`Points` 的管理权
也自动挪到 Safe——**不会留下「前任所有者」**。 `[proven]`

---

## 小结

- 挖矿 1 / 熔炼 2 / 质押 2 / PvP 胜利 3（链上活跃积分）。 `[proven]`
- 积分为链上数据，排行榜从中读取；赛季是链下的。 `[proven]`
- 事件 `PointsAdded` 可审计。 `[proven]`
- **积分没有货币价值。** `[proven]`

---

*下一步：[赛季](seasons.md) · [玩法总览](README.md) · [法律声明](../project/legal-disclaimer.md)*
