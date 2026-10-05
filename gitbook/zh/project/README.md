# 项目总览

本部分汇集**工程与治理**信息：合约与地址、安全与所有权模型、官方链接、FAQ、路线图、术语表、
法律声明，以及给 AI 智能体的入口。

---

## 这是什么项目

**Spirit Cards**（代币符号 `SPC`；链上 `name() = "Spirit Cards"`，`symbol() = "SPC"`）是一款部署在 **Robinhood Chain** 上的
链上收藏 / 对战游戏。卡牌靠 **PoW 挖矿**获得，稀有度与数值由链上种子确定性推导，玩法包含
熔炼、对战、质押与积分。

| 维度 | 说明 |
|---|---|
| 网络 | Robinhood Chain（Arbitrum Orbit L2）；当前部署在测试网 `46630`（t8 演练），主网 `4663` 为目标，Gas = ETH |
| 核心合约 | `Config`、`SpiritCards`、`ChipToken`、`StakeVault`、`Battle`、`Points`、`Packs` |
| 总量 | 8888 张（`maxSupply`） |
| 所有权 | 多签 Safe 2-of-3（`Config` 所有者暂为 deployer，移交为单独步骤） |
| 代币 | 没有 ERC-20；卡牌是 ERC-721，筹码是 ERC-1155 |

---

## 主要页面

| 页面 | 内容 |
|---|---|
| [合约与地址](contracts-and-addresses.md) | 合约清单、已部署地址、已核对关联 |
| [安全与所有权](security-and-ownership.md) | 安全模型、所有权移交、审计状态 |
| [官方链接](official-links.md) | 网站、X、Telegram、GitHub |
| [常见问题 FAQ](faq.md) | 高频疑问速答 |
| [路线图](roadmap.md) | 已完成 / 进行中 / 计划 |
| [给 AI 智能体](for-ai-agents.md) | 机器可读的项目摘要与入口 |
| [术语表](glossary.md) | 中英对照术语 |
| [法律声明与免责声明](legal-disclaimer.md) | 风险与合规 |

---

## 重要立场

> [!WARNING]
> - **这是一款游戏 / 实验，不是投资产品。** 没有任何收益保证。
> - 全站**不出现任何 APY、收益率或「回本天数」**。分红池 / 国库只是「项目实际赚取的手续费的
>   一部分，且无任何保证」。
> - **积分没有货币价值。**
> - 对战是押注机制，**可能输掉钱和卡**。
> - 详见 [法律声明与免责声明](legal-disclaimer.md)。

---

*下一步：[合约与地址](contracts-and-addresses.md) · [安全与所有权](security-and-ownership.md) · [官方链接](official-links.md)*
