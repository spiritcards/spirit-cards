# 术语表

本页汇总文档中出现的术语。中文为面向中文读者的**惯用说法**（非逐字翻译）。技术标识符、
合约名、函数名保留英文。

---

## 循环的五个环节

| 中文 | EN | 链上标识 | 含义 |
|---|---|---|---|
| 挖（矿） | MINE | 挖 | 搜索 `nonce`，PoW；支付价格并获得卡 |
| 熔（炼） | MERGE | 熔 | 烧 2 张 → 铸 1 张更高等级的卡 |
| 对战 | BATTLE | ⚔ | 两张卡之间的托管押注决斗 |
| 质押 | STAKE | 押 | 卡存入金库，按权重分红 |
| 积分 | POINTS | 榜 | 链上活跃积分 + 排行榜 |

---

## 概念

| 中文 | EN | 含义 |
|---|---|---|
| 回本（概念） | break-even (concept) | 「投入 / 取得」的**概念**。因无保证，项目**不发布**任何数值化的回本期限 |
| 白嫖感 | free-to-play feel | 免费 / 优惠的体验（折扣、赠送、赞助首铸）`[planned]` |
| 公平 | fairness | 可验证合约、PoW、种子确定性稀有度 |
| 攀比 | rivalry | 「想进前列」的驱动力（排行榜） |
| 循环 | loop / grind | 可重复的动作循环 |
| 拆卡 | pack opening | 购买 / 拆开卡包的动画 |
| 卡包 | pack | 带折扣的多卡组合 |

---

## 机制与术语

| 中文 | EN | 链上标识 | 含义 |
|---|---|---|---|
| 工作量证明 | Proof-of-Work | PoW | 证明已完成的计算（找到合法哈希） |
| 难度 | difficulty | `baseBits` | 要求的前导零比特数 |
| 难度棘轮 | difficulty ratchet | — | 「快涨慢跌」的调节器（**不使用**） |
| 冷却 | cooldown | `mineCooldown` | 每钱包两次挖矿之间的间隔 |
| 时段 / 纪元 | epoch | `epochCap` / `epochLength` | 发行限流的窗口（默认 1 小时） |
| 价格纪元 | price era | `eraSize` / `eraPrice` | 同价的卡块；每纪元价格 +25% |
| 筹码 / 券 | chip | `ChipToken` | ERC-1155，下次铸造 −30% |
| 种子 | seed | `seed` | 链上随机源，推导数值与稀有度 |
| 稀有度 | rarity | `rarity` | N / R / SR / UR / SSR / Prism |
| 编号 | serial number | `#N` | 卡在发行量中的序号 |
| 元素 | element | `element` | Ember / Stone / Gale / Tide（4 种，石头剪刀布） |
| 技能 | skill | `skill` | crit / shield / pierce / precision / vigor / none |
| 押注 | stake | `stake` | 决斗中的 ETH 押注 |
| 奖池 | pot | `pot` | 双方押注之和（`2 × stake`） |
| 抽水 | rake | `pvpRakeBps` | 决斗奖池的手续费（10%） |
| 生命 | lives (❤) | `lives` | 卡有 3 条命；0 → 销毁 |
| 销毁 | burn | — | 销毁卡 / 代币（通缩） |
| 权重 | stake weight | `tierWeightX1000` | 分红份额的乘数（1×–40×） |
| 分红池 | pool | `poolBps` | 质押者分红的来源 |
| 分红 | dividends | — | 按权重分给质押者的池份额 |
| 国库 | treasury | `houseBps` | 团队 / 市场所得（30%） |
| 储备 | reserve | `reserveBps` | 资金来源去向（`reserveBps = 0` 时未用） |
| 分配比例 | revenue split | — | 60 / 10 / 30 / 0（池 / 推荐 / 国库 / 储备） |
| 版税 | royalty | `royaltyBps` (ERC-2981) | 二级销售的 5% → 国库 |
| 推荐 | referral | `referralBps` | 对被推荐人**行为**的百分比 |
| 上级推荐 | master ref | `masterRefBps` | 固定的「顶层」推荐（3% 毛支付额） |
| 公示概率 | public pull-rate | — | 公开披露的掉落概率 |
| 保底 | pity | `pity` | N 次后保证稀有的机制（计数器） |
| 排行榜 | leaderboard | — | 按积分排序的名次表 |
| 赛季 | season | — | 竞争窗口（仅重置排行榜） |
| 多签 | multisig / Safe | — | 项目管理钱包 Safe 2-of-3 |
| 可调核心 | tunable core | `Config` | 参数在 `Config` 内，可免重部署调整 |

---

## 网络与资产

| 中文 | EN | 含义 |
|---|---|---|
| Robinhood 链 | Robinhood Chain | Arbitrum Orbit L2；当前部署测试网 chainId 46630（主网 4663 为目标，未部署） |
| Gas 费 | gas | 网络手续费，以 ETH 计 |
| 交易市场 | marketplace | OpenSea（二级交易） |
| 主网 | mainnet | 正式网络 |
| 智能合约 | smart contract | 链上程序 |

---

## 合约速查

| 合约 | 作用 |
|---|---|
| `Config` | 参数中心 |
| `SpiritCards` | 主 NFT（ERC-721 + ERC-2981） |
| `ChipToken` | 筹码（ERC-1155） |
| `StakeVault` | 质押金库 |
| `Battle` | 决斗 |
| `Points` | 积分 |
| `Packs` | 卡包 |

---

*返回：[项目总览](README.md) · [简介](../introduction/README.md) · [法律声明](legal-disclaimer.md)*
