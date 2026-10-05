# 路线图

> [!NOTE]
> 路线图区分**已完成**、**进行中 / 计划**。所有「计划」项都可能调整。带 `[planned]` 的项目
> **尚未实现**。

---

## 已完成

| 项目 | 状态 |
|---|---|
| 核心合约：`Config` / `SpiritCards` / `ChipToken` / `StakeVault` / `Battle` / `Points` / `Packs` | `[proven]` |
| PoW 挖矿（合约校验 + 浏览器 / CLI 挖矿器） | `[proven]` |
| 后置种子（防预先研磨）与确定性稀有度 | `[proven]` |
| 16 物种美术 + 种子确定性渲染 | `[proven]` |
| 熔炼（2→1，含 7% 空熔防套利） | `[proven]` |
| 质押金库（6 档权重、批量操作、质押卡参战） | `[proven]` |
| **Battle v2**（元素 + 技能 + 结果浮动 + 富化事件 `DuelDetail`） | `[proven]` |
| 卡包（5 档折扣、保底计数） | `[proven]` |
| 积分与链上排行榜 | `[proven]` |
| 收入分配（pool 60 / referral 10 / treasury 30 / reserve 0）与推荐（上级 3% + 邀请人 7%） | `[proven]` |
| `pumpPool()` 免许可注入分红池 | `[proven]` |
| **链上改名（rebrand）为 Spirit Cards / SPC** | `[proven]` |
| 官网正式域名 `spiritcards.fun`（LIVE） | `[proven]` |
| 内部安全评审 + 418/418 测试 | `[proven]` |
| 部署 **t8**（Robinhood Chain 测试网 `46630` 演练，2026-10-04） | `[proven]` |

---

## 进行中 / 计划

| 项目 | 状态 |
|---|---|
| `Config` 所有权移交 **Safe 2-of-3**（两步流程） | `[planned]` |
| 为 `Config` 增加 **timelock**（参数变更延迟） | `[planned]` |
| 「一键」内嵌钱包（Face ID / 邮箱，Privy） | `[planned]` |
| **主网部署 t9**（`chainId 4663`；主网地址公布） | `[planned]` |
| **赛季**（链下窗口 + 皮肤 / 物品奖励，非货币） | `[planned]` |
| 卡包「开包」动画（打包系统） | `[planned — 已有设计文档]` |
| 成套（集齐）奖励（皮肤 / 唯一物品，非货币） | `[planned]` |
| 追卡（chase card）每季 1–2 张 | `[planned]` |
| 外部合作 / 赞助注入分红池 | `[planned]` |

---

## 明确**不**做

- **没有 ERC-20 代币**，没有 LP。
- **不用 Uniswap**（只走二级市场）。
- **不发布 APY / 收益率 / 回本期限**。
- **不做难度棘轮**（这是刻意避开的失败模式）。 `[proven]`
- **不设付费外部审计**（当前阶段；策略以 Safe + 测试为主）。 `[proven]`

---

## 设计原则（贯穿始终）

1. **可调核心**，避免「不可变核心无法修复」。 `[proven]`
2. **节奏由协议控制**，而非算力竞赛。 `[proven]`
3. **一切可验证**：种子确定性、事件可审计、结果可复现。 `[proven]`
4. **诚实表述**：不承诺收益、不隐藏扣费、明确标注不确定处。 `[proven]`

---

*下一步：[给 AI 智能体](for-ai-agents.md) · [常见问题 FAQ](faq.md) · [法律声明](legal-disclaimer.md)*
