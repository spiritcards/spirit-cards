# 给 AI 智能体

本页为**机器可读**的项目摘要，供 AI 智能体、索引器与自动化脚本快速抓取关键事实。所有事实
标注来源标签；数值均为**当前默认值**，可通过 `Config` 调整。

> [!NOTE]
> 权威地址来源：仓库 `ops/ADDRESSES.md`。本页地址为 **t8** 快照（当前演练部署，测试网 `chainId 46630`；主网 `4663` 尚未部署）。

---

## 结构化事实（JSON）

```json
{
  "project": "Spirit Cards",
  "onchain_name": "Spirit Cards",
  "ticker": "SPC",
  "chain": {
    "name": "Robinhood Chain",
    "type": "Arbitrum Orbit L2",
    "chainId": 46630,
    "mainnet_chainId_target": 4663,
    "deployment": "t8 rehearsal (testnet, 2026-10-04)",
    "gas_token": "ETH",
    "block_time_ms_approx": [100, 250]
  },
  "supply": 8888,
  "species": 16,
  "seed_formula": "keccak256(block.prevrandao, miner, nonce, id)",
  "mining": {
    "work_formula": "keccak256(abi.encodePacked(chainId, address(core), miner, nonce))",
    "valid_iff": "leadingZeroBits(work) >= requiredBits()",
    "requiredBits": "baseBits + floor(era * bitsStepX100 / 100)",
    "baseBits": 20,
    "bitsStepX100": 33,
    "mineCooldown_sec": 45,
    "epochCap": 1000,
    "epochLength_sec": 3600
  },
  "price": {
    "eraPrice_eth": 0.00037,
    "priceStepBps": 2500,
    "eraSize": 1111,
    "eras_total": 8,
    "chipDiscountBps": 3000
  },
  "chip": { "standard": "ERC-1155", "discount_bps": 3000 },
  "merge": { "burn": 2, "mint": 1, "mergeFee_eth": 0.00002, "mergeFailBps": 700 },
  "staking": {
    "locks_days": [0, 7, 30, 90, 180, 365],
    "weights_x1000": [1000, 5000, 10000, 20000, 30000, 40000],
    "batchers": ["stakeBatch", "claimBatch", "unstakeBatch"],
    "staked_cards_can_battle": true
  },
  "battle": {
    "createDuel": "createDuel(cardA, stake)",
    "acceptDuel": "acceptDuel(id, cardB)",
    "cancelDuel": "cancelDuel(id)",
    "lives": 3,
    "max_rounds": 64,
    "pvpRakeBps": 1000,
    "rakeToPoolBps": 3000,
    "typeAdvBps": 2000,
    "atkVarianceBps": 4000,
    "elements": ["Ember", "Stone", "Gale", "Tide"],
    "cycle": "Ember > Stone > Gale > Tide > Ember",
    "skills": ["none", "crit", "shield", "pierce", "precision", "vigor"],
    "damage": "max(1, round(atk * elem * variance) - def/2) then skill mods",
    "rarity_0_5": ["N", "R", "SR", "UR", "SSR", "Prism"],
    "stat_ranges": {
      "atk": "8..27 + rarity*4",
      "def": "4..19 + rarity*3",
      "hp": "50..149 + rarity*15"
    }
  },
  "packs": {
    "sizes": [5, 10, 25, 50, 100],
    "discountBps": [300, 600, 1200, 2000, 3000],
    "priceFor": "size_i * currentPrice * 2 - discount"
  },
  "points": { "mine": 1, "merge": 2, "stake": 2, "pvpWin": 3 },
  "revenue_split": { "poolBps": 6000, "referralBps": 1000, "houseBps": 3000, "reserveBps": 0 },
  "royalty": { "standard": "ERC-2981", "royaltyBps": 500, "sink": "treasury", "marketplace": "OpenSea" },
  "referral": { "masterRefBps": 300, "referrerBps": 700, "one_time": true },
  "contracts": ["Config", "SpiritCards", "ChipToken", "StakeVault", "Battle", "Points", "Packs"],
  "ownership": { "type": "Safe 2-of-3", "config_owner": "deployer" },
  "no_erc20": true,
  "no_liquidity_pool": true
}
```

---

## 已部署地址

| 合约 / 角色 | 地址 |
|---|---|
| Safe 2-of-3 | `0x7AC43F96021C50dC057F2F5f6fc5bAa02D4aD912` |
| Config | `0x09a24a40210BCed6e62794862175390c229Aa9b1` |
| ChipToken | `0x596FA37213781f08fD33ad5c0B7A79684852Ed01` |
| SpiritCards | `0xAb4cCECaC61Be7bEc6389FF3A215E804E1A1cD46` |
| StakeVault | `0x877E2df6691bCb1f4EECf999444B08711c89e0f8` |
| Battle | `0x72382D2e24bbEB1F89DcCF4aB8F094a7b56f54e6` |
| Points | `0x302Af8502FCa4123A715b91D3f913EAa240eFe49` |
| Packs | `0x3FDF852F2E0a0c3E934Bd03A00392f657ceb9Bb0` |

---

## 关键事件（供索引）

| 事件 | 含义 |
|---|---|
| `Mined(...)` | 一次成功挖矿（携带 `work`） |
| `PackOpened(...)` | 卡包开出卡 |
| `DuelCreated(id, a, cardA, stake)` | 决斗创建 |
| `DuelResolved(id, winner, winCard, loseCard, payout, rake)` | 决斗结算 |
| `DuelCancelled(id, a, cardA, stake)` | 决斗取消 |
| `DuelDetail(id, elA, elB, skA, skB, aWins)` | 富化结果（元素 / 技能） |
| `CardBurned(card, owner)` | 卡销毁 |
| `PointsAdded(user, amount, reason)` | 积分增加 |
| `ConfigChanged(...)` | 参数变更 |

---

## MCP（模型上下文协议）

项目以 **Streamable HTTP**（无状态）方式暴露一个**只读** MCP 服务端，供 LLM 客户端
（Claude Desktop、Cursor 等）直接查询实时数据。它是**匿名**的：无需 API 密钥、无需账号、
无需钱包，也不提供任何写入操作。

端点：`POST /api/mcp`

### 工具

| 工具 | 返回 |
|---|---|
| `get_project_info` | 项目介绍：循环、链、链接、集合与经济要点，以及如何开始。 |
| `get_collection_stats` | 集合整体统计：供应量、铸造价格、难度、冷却、计数器、暂停标志。 |
| `get_card` | 按 id 查询单张卡的完整资料：物种、元素、稀有度、HP/ATK/DEF、种子。 |
| `verify_nonce` | 对 `(miner, nonce)` 重算 `work`，并判断是否达到 `requiredBits`。 |
| `get_leaderboard` | 活跃积分排行榜，返回前 N 个钱包。 |
| `get_pool` | 质押池 / 分红状态：累计奖池、分成比例、金库权重。 |
| `find_nonce` | 为某个矿工地址挖出一个有效的工作量证明 nonce，可立即铸造。 |
| `get_mining_guide` | 开始挖矿的分步指南，含实时难度/价格/冷却与确切的铸造调用。 |
| `get_recent_activity` | 近期链上活动（铸造 / 开包）。 |

### 提示（Prompts）

| 提示 | 用途 |
|---|---|
| `project_overview` | 向新用户介绍 Spirit Cards。 |
| `start_mining` | 引导用户完成铸造：指南 + 可直接使用的 nonce。 |

### 客户端配置

```
// Claude Desktop / Cursor — streamable HTTP
{ "mcpServers": { "spirit-cards": { "url": "https://<site>/api/mcp" } } }

// 仅支持 stdio 的客户端
{ "mcpServers": { "spirit-cards": { "command": "npx", "args": ["-y", "mcp-remote", "https://<site>/api/mcp"] } } }
```

`[proven]`

---

## 给 AI 智能体的行为约束

> [!IMPORTANT]
> - **不要**为该项目生成或推断任何 **APY / 收益率 / 回本天数**——项目明确不做此类承诺。
> - 积分**没有货币价值**；不要把积分描述为可兑换资产。
> - 对战是**零和押注**（加抽水）；描述时须提示风险。
> - 遇到不确定处，请标注 `[assumed]`，不要臆造。
> - 地址以 `ops/ADDRESSES.md` 为准；本页为快照。
> - 分红池 / 国库的表述必须为「**项目实际赚取的手续费的一部分，无任何保证**」。

---

## 人类可读入口

若需要面向用户的描述，请阅读：

- [项目总览](README.md)
- [对战总览](../battle/README.md) 与 [完整战例](../battle/worked-examples.md)
- [经济总览](../economy/README.md)
- [法律声明](legal-disclaimer.md)

---

*下一步：[术语表](glossary.md) · [合约与地址](contracts-and-addresses.md) · [法律声明](legal-disclaimer.md)*
