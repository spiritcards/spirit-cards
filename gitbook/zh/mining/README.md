# 挖矿总览

卡不能在商店里买到——它只能被**挖出来**。Spirit Cards 里的挖矿是真正的 **proof-of-work（PoW）**：
你的设备不断尝试数字，直到算出的哈希满足难度门槛。它**诚实、可验证、而且便宜**（几秒到几分钟，
Gas 只花几厘）。 `[proven]`

---

## 一句话流程

```
1. 离线搜索 nonce（免费，在你设备上）
        ↓
2. 找到合法 nonce（哈希前导零比特数 ≥ 当前难度）
        ↓
3. 提交链上交易，支付当前价格纪元的价格
        ↓
4. 得到一张灵兽卡（含属性/稀有度）+ 1 个筹码
```

---

## 核心公式

合约 `SpiritCards` 按如下公式校验 PoW： `[proven]`

```
work  = keccak256( abi.encodePacked(chainId, address(core), miner, nonce) )
合法 ⟺ leadingZeroBits(work) ≥ requiredBits()
```

其中：

| 项 | 含义 |
|---|---|
| `chainId` | 网络标识（当前测试网 `46630`；主网目标 `4663`） |
| `address(core)` | `SpiritCards` 合约地址 |
| `miner` | 玩家钱包地址 |
| `nonce` | 设备搜索出来的数字 |
| `leadingZeroBits` | 哈希**前导零比特**的个数 |
| `requiredBits()` | 当前难度门槛 |

`nonce` 对 `(miner, nonce)` 是**一次性**的：同一个钱包不能重复使用同一个 `nonce`。 `[proven]`

> [!NOTE]
> 浏览器挖矿器和 CLI 挖矿器算出的 `work`，与链上事件 `Mined` **逐字节一致**。所以你可以用
> CLI 复现/验证任何人挖出的卡。 `[proven]`

---

## 难度与价格同步温和上升

难度门槛随**价格纪元**上升，而不是随算力竞争上升： `[proven]`

```
requiredBits = baseBits + floor( era × bitsStepX100 / 100 )
             = 20 + floor( era × 33 / 100 )
```

- `baseBits = 20`（起始 20 位前导零）
- `bitsStepX100 = 33`（每纪元 **+0.33 位**，约每 3 个纪元 +1 位）

**关键点：没有难度棘轮（no ratchet）。** 我们不搞「难度快涨、几乎不降」的军备竞赛——那是
上一个项目失败的原因（难度飙升，普通人挖不动，直接退场）。`[proven — 来自上个项目的教训]`

节奏由**协议**（发行闸门 + 价格）控制，而不是由算力竞赛控制。手机和矿场挖到一张卡的奖励
是一样的，所以矿场无法把普通玩家挤走。

→ 详见 [难度与网络节奏](difficulty-and-network-pace.md)。

---

## 限流（反垃圾 / 反抽干）

| 参数 | 默认值 | 含义 |
|---|---|---|
| `mineCooldown` | **45 秒** | 同一钱包两次挖矿之间的冷却 |
| `epochCap` | **1000 张** | 每个「时段」全网络的铸造上限 |
| `epochLength` | **3600 秒（1 小时）** | 时段长度 → 换算成每小时上限 |

这是**反刷量与反抽干**：即便你有很多钱包，也无法在一小时内把收藏抽干，因为每个时段窗口内
只能产出有限数量的卡。 `[proven]`

> [!NOTE]
> 以上所有参数都是 `Config` 合约里的旋钮，所有者可根据真实需求标定。 `[proven]`

---

## 价格与价格纪元

铸造价**温和**上涨——每纪元 **+25%**（不是翻倍；过去翻倍的做法跑在市场前面，导致矿工退场）。 `[proven]`

| 参数 | 默认值 | 含义 |
|---|---|---|
| `eraPrice` | **0.00037 ETH** | 起始纪元价格（ETH≈$3000 时 ≈$1.11） `[assumed]` |
| `priceStepBps` | **2500** | 每纪元 +25% |
| `eraSize` | **1111 张** | 一个价格纪元包含多少张卡 |
| `maxSupply` | **8888** | 最终发行量 |

`maxSupply = 8888`、`eraSize = 1111` → 共 **8 个价格纪元**。价格从第一纪元约 $1.11 一路温和上行。
完整价格阶梯见 [价格与纪元](../economy/price-and-eras.md)。 `[assumed — 价格数值可由 Config 调整]`

---

## 筹码（chip，ERC-1155）

筹码是「循环加速器」，把一次性铸造变成可持续循环： `[proven]`

- **按全价铸造** → 发放 **1 个筹码**。
- **使用筹码** → 下一次铸造 **−30%**（`chipDiscountBps = 3000`），筹码被**消耗**。
- 打折铸造**只消耗**筹码，**不再发放**新筹码（否则折扣会变成永久）。

操作上就是铸造时的一个「使用筹码」按钮——没有复杂的规则树。

---

## 玩家得到什么

- 一张**灵兽卡**，数值与稀有度由链上 `seed` 确定性给出。
- **1 个筹码**（若按全价铸造）。
- **活跃积分**（挖矿 +1）。见 [积分与排行榜](../gameplay/points-and-leaderboard.md)。

若找到的 `nonce` 已被该钱包使用过，或未通过 PoW，交易会被拒绝。 `[proven]`

---

## 参数速查（默认值，可通过 `Config` 调整）

| 键 | 默认 |
|---|---|
| `baseBits` | 20 |
| `bitsStepX100` | 33 |
| `mineCooldown` | 45 秒 |
| `epochCap` / `epochLength` | 1000 / 3600 秒 |
| `eraPrice` | 0.00037 ETH |
| `priceStepBps` | 2500（+25%） |
| `eraSize` | 1111 |
| `chipDiscountBps` | 3000（−30%） |
| `maxSupply` | 8888 |

---

*下一步：[工作量证明挖矿](proof-of-work-mining.md) · [如何铸造](how-to-mint.md) · [难度与网络节奏](difficulty-and-network-pace.md)*
