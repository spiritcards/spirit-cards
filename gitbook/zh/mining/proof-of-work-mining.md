# 工作量证明挖矿

这一页深入讲 PoW 本身：哈希怎么算、前导零比特怎么数、为什么这是「真」的工作量证明，
以及为什么挖矿本身是免费的。

---

## 哈希的构造

合约 `SpiritCards` 校验的哈希是： `[proven]`

```solidity
bytes32 work = keccak256(
    abi.encodePacked(chainId, address(core), miner, nonce)
);
```

拆解每一部分：

| 部分 | 类型 | 作用 |
|---|---|---|
| `chainId` | uint | 把哈希绑定到具体网络（防止跨链重放） |
| `address(core)` | address | 把哈希绑定到 `SpiritCards` 合约本身 |
| `miner` | address | 把哈希绑定到**你的钱包**（不能代他人挖） |
| `nonce` | uint | 你要搜索的自由变量 |

> [!NOTE]
> 因为 `miner` 参与哈希，你找到的合法 `nonce` **只能被你**用于铸造，别人拿去用无效。
> 同一 `(miner, nonce)` 的组合也**只能用一次**。 `[proven]`

---

## 前导零比特（leadingZeroBits）

`leadingZeroBits(work)` 表示哈希二进制里**从最高位开始连续为 0 的比特数**。

例如（示意，非真实哈希）：

```
work = 0x0009a3...   →  前 12 位是 0，第 13 位是 1
                     →  leadingZeroBits = 12
```

合法性条件：

```
leadingZeroBits(work) >= requiredBits()
```

难度每多 1 位，期望需要尝试的次数就**翻倍**。所以「+0.33 位/纪元」意味着**大约每 3 个纪元
难度翻一倍**。 `[assumed — 由概率推导：期望尝试次数 = 2^bits]`

---

## 期望尝试次数

若要求 `b` 位前导零，则平均需要尝试约 `2^b` 次： `[assumed — 概率推导]`

| `requiredBits` | 期望尝试次数（量级） |
|---|---|
| 18 | ~ 26 万 |
| 20 | ~ 105 万 |
| 22 | ~ 420 万 |
| 24 | ~ 1670 万 |
| 26 | ~ 6700 万 |

现代手机/浏览器每秒能算百万级的 `keccak256`，所以在低难度（如 20 位）下通常**几秒到几十秒**
就能命中一张卡。实际速度取决于设备和当前难度。 `[assumed]`

> [!WARNING]
> 上面的数字是**量级估计**，用来帮你理解难度增长的手感，不是精确的承诺。实际结果具有随机性，
> 可能很快命中，也可能偏慢。 `[assumed]`

---

## 为什么挖矿本身是免费的

- **搜索 `nonce` 完全在你的设备上离线进行**：不产生链上交易，不花 Gas。 `[proven]`
- **只有当你找到合法 `nonce`、决定铸造时**，才提交一笔链上交易，支付铸造价 + Gas。 `[proven]`
- 所以你可以先挖到很多候选，再决定要不要花钱把它们变成卡。

---

## 挖矿器（miner）

项目提供两种挖矿器： `[proven]`

| 类型 | 场景 | 特点 |
|---|---|---|
| **浏览器 PoW 引擎** | 普通玩家 | 后台自动挖矿，切换页面也不断 |
| **CLI 挖矿器** | 矿场 / 高级用户 | 算出的 `work` 与链上事件 `Mined` 逐字节一致 |

> [!NOTE]
> **矿场没有额外优势。** 出卡速度由协议（冷却 + 时段上限 + 价格）控制，不由算力独吞。
> 挖得快，只是让你更快**找到候选**，但每张卡的成本和限流对所有人一样。 `[proven]`

---

## 校验与可复现

- 合约本身即时校验 PoW：不合法直接 revert。 `[proven]`
- 任何人拿到 `(chainId, core, miner, nonce, seed)` 都能**离线复算**哈希与卡牌数值。 `[proven]`
- 链上事件 `Mined` 携带 `work`，与 CLI 挖矿器结果一致，便于审计。 `[proven]`

---

## 作弊面与防护

| 攻击 | 防护 |
|---|---|
| 复用 `nonce` | 对 `(miner, nonce)` 一次性记录，重复即拒绝 `[proven]` |
| 替他人挖矿 / 盗用候选 | `miner` 参与哈希，候选与钱包绑定 `[proven]` |
| 提前挑稀有卡 | 种子依赖 `block.prevrandao`，铸造前不可知 `[proven]` |
| 刷量抽干 | 冷却 + 时段上限 + 价格闸门 `[proven]` |

---

## 小结

- `work = keccak256(chainId, core, miner, nonce)`，合法 ⟺ 前导零比特 ≥ `requiredBits()`。 `[proven]`
- 难度随纪元 **+0.33 位**，没有棘轮。 `[proven]`
- 挖矿离线免费，只有铸造上链才花钱。 `[proven]`
- 矿场没有速度优势，节奏由协议决定。 `[proven]`

---

*下一步：[如何铸造](how-to-mint.md) · [难度与网络节奏](difficulty-and-network-pace.md) · [价格与纪元](../economy/price-and-eras.md)*
