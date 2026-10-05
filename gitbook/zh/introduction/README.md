# 简介

**Spirit Cards**（代币符号 `SPC`）是一款围绕「灵兽卡牌」构建的链上游戏。
它的核心不是「买一张图」，而是「**挖出一只生物**」：卡牌是真正的 PoW 挖矿产出的，
稀有度和战斗数值从链上种子确定性推导，任何人都能复算。

> [!NOTE]
> 本文档面向中文加密社区。技术标识符、合约名、函数名（如 `keccak256`、`requiredBits()`、
> `createDuel`）保留英文原样，这是技术文档的通行做法。

---

## 一句话概括

- **卡不能买，只能挖。** 挖矿是真实的 proof-of-work。
- **数值可验证。** 稀有度、元素、技能、攻防全部由链上 `seed` 推导，可复算。
- **有四个玩法环节。** 熔炼（进化）、对战（押注决斗）、质押（分红）、积分（排行榜）。
- **核心可调。** 参数集中在 `Config` 合约，由多签管理，无需重新部署即可调整平衡。
- **这是一款游戏/实验，不是投资。** 详见 [法律声明](../project/legal-disclaimer.md)。

---

## 游戏循环

游戏是一个五环节循环，玩家会重复成百上千次：

```
挖 MINE  →  熔 MERGE  →  ⚔ BATTLE  →  押 STAKE  →  榜 POINTS  →  循环
```

| 环节 | EN | 做什么 | 得到什么 |
|---|---|---|---|
| 挖 | MINE | 找 `nonce`，支付纪元价格铸造 | 一只带属性的灵兽卡 + 1 个筹码 |
| 熔 | MERGE | 烧掉 2 张卡 | 1 张更高等级的卡（进化） |
| ⚔ | BATTLE | 用卡 + ETH 押注对战 | 赢家拿奖池减抽水；输家掉一条命 |
| 押 | STAKE | 把卡存进金库 | 按权重获得分红池份额 |
| 榜 | POINTS | 累积活跃积分 | 赛季排行榜名次 |

循环里有两条重要红线（详见各专页）：

1. **难度没有「棘轮」。** 难度只随价格纪元温和上升，不搞「快涨慢跌」的军备竞赛——所以普通玩家
   不会被矿场挤走。见 [难度与网络节奏](../mining/difficulty-and-network-pace.md)。
2. **没有任何收益保证。** 质押分红只是「项目实际手续费的一部分」。见
   [法律声明](../project/legal-disclaimer.md)。

---

## 为什么是 Robinhood Chain

项目部署在 **Robinhood Chain**（Arbitrum Orbit L2）：Gas 用 **ETH**，当前线上部署在测试网 `chainId 46630`（主网 `4663` 为目标），
出块约 100–250 ms。选择它的原因是**低 Gas、原生支持 OpenSea 二级市场、
开箱即用的账户抽象（ERC-4337）**，以及 Robinhood 品牌带来的认知度。 `[assumed]`

> [!NOTE]
> Robinhood 的原有用户主要是**股票交易者**，不是加密玩家。项目**不依赖**他们形成天然需求；
> 目标受众是**中文加密社区**。 `[assumed]`

---

## 项目由什么组成

| 部分 | 内容 |
|---|---|
| 合约（Foundry） | `Config`、`SpiritCards`、`ChipToken`（ERC-1155）、`StakeVault`、`Battle`、`Points`、`Packs` `[proven]` |
| 网站（Next.js） | Collection · Mine · Stake · Battle · Merge · Points · Docs，另有 Pool · Profile 等页面 `[proven]` |
| 挖矿器 | 浏览器 PoW 引擎（后台自动挖）+ CLI 挖矿器（矿场） `[proven]` |
| 美术 | 16 个物种（8 通用 + 8 龙），由种子确定性渲染 `[proven]` |

---

## 继续阅读

- **[收藏与世界](the-collection.md)** — 世界里的 16 个物种、稀有度、编号与「集齐」玩法
- **[生物 · 元素 · 稀有度](creatures-elements-and-rarity.md)** — 数值如何从种子推导
- **[快速上手](getting-started.md)** — 第一次挖矿
- **[对战](../battle/README.md)** — 游戏的重点机制
- **[常见问题](../project/faq.md)** — 高频疑问速答

---

*下一步：[收藏与世界](the-collection.md) · [快速上手](getting-started.md)*
