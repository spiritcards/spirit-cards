# 安全与所有权

这一页描述 Spirit Cards 的**安全模型**与**所有权移交**。这是高层描述；细节以内部安全评审与
测试为准。

---

## 设计原则

| 原则 | 实现方式 |
|---|---|
| **可调核心** | 参数在 `Config` 中，不是硬编码。教训：不可变核心无法修复。 `[proven]` |
| **所有权 = 多签** | 所有者 = **Safe 2-of-3**。单一私钥无法转移资金。 `[proven]` |
| **两步所有权** | 所有权转移分两步（`nominate` → `accept`），避免误丢权限。 `[proven]` |
| **暂停开关** | `paused`（所有者）——异常时秒级刹车。但 `unstake` **不**被暂停。 `[proven]` |
| **重入保护** | 关键函数加 `ReentrancyGuard`（铸造、分配、提现、对战、质押）。 `[proven]` |
| **免许可 keeper** | `pumpPool()` 任何人可调——资金永远进金库，不进调用者。 `[proven]` |
| **地址透明** | 官方地址 ≠ 团队 / 个人地址；唯一权威来源 `ops/ADDRESSES.md`。 `[proven]` |

---

## 后置种子（防预先研磨）

卡牌稀有度**无法在铸造前预测或挑选**：种子使用 `block.prevrandao`（区块随机源），因此无法
提前「选到稀有」。 `[proven]`

熔炼同理：子卡种子依赖区块随机性，所以配对组合**无法提前尝试**。 `[proven]`

---

## 战斗公平性

- 战斗结算**确定性且可复现**：给定种子、押注、`prevrandao`，结果可重算。 `[proven]`
- 战斗使用 **`acceptDuel` 执行区块的 `prevrandao`**，接受方在签名时未知——所以无法「调」结果。 `[proven]`
- 押注只在**不同钱包之间**（A ≠ B）；抽水机制天然压制**刷量**。 `[proven]`

---

## 所有权移交（Handover）

当前状态（t8）：`treasury` = **Safe**，`ChipToken.owner` = **Safe**，`Points.owner` =
`Config.owner`；而 `Config` 所有者暂为 **deployer**。 `[proven]`

**计划：** 将 **`Config` 所有者**通过**两步流程**移交给 **Safe 2-of-3**。由于
`Points.owner` 等模块**跟随** `Config.owner()`，管理权会自动迁到 Safe，**不会留下「前任所有者」**。 `[planned]`

建议为 `Config` 增加 **timelock**（参数应用延迟）——这样变更可见、且非瞬时生效。 `[planned]`

---

## 审计状态

- 已完成内部**合约安全评审**，据此修复了若干问题（筹码消耗、`burned` 标志、熔炼不变量、
  `mergeFailBps`、`Points` 跟随 `Config` 等）。 `[proven]`
- **测试：418/418**（fuzz + 不变量 + 边界情形 + 质押-战斗 + `AuditFixes`）。 `[proven]`
- 当前阶段**未计划付费外部审计**（所有者决定）；策略以 Safe + 测试为主。 `[proven]`
- **内部审计未发现 critical / high 级别问题。** `[proven]`

> [!WARNING]
> 任何审计（内部或外部）都**不能**让合约变得无风险。这是一个**实验**；请使用力所能及的金额。
> 见 [法律声明](legal-disclaimer.md)。

---

## 从上一个项目继承的最佳实践

- **统一地址来源 + 构建门禁** —— 地址在任何地方不一致，构建就失败。 `[proven]`
- **Python ↔ TS 一致性** —— 服务端与前端渲染卡牌结果一致（自动校验）。 `[proven]`
- **离线 fork E2E** —— 在花费真钱之前，先在本地网络副本上跑通整条链路。 `[proven]`
- **共享存储中的限流** —— 计数器放在共享存储，而非 serverless 内存里。 `[proven]`
- **密钥只存在 KeePass**，不在代码、不在日志里。 `[proven]`

---

## 由所有者控制的旋钮（以及为什么这没问题）

`Config` 的旋钮允许调整价格、难度、限流、分配比例、抽水等。这是**有意设计**：可以按真实需求
微调平衡，而无需重新部署合约。所有者**不是单一私钥**，而是 **Safe 2-of-3**，且每次改动都会
发出链上事件 `ConfigChanged`，因此可被审计。 `[proven]`

---

## 小结

- 所有者 = Safe 2-of-3，两步转移；核心可调；关键函数有重入保护与暂停开关。 `[proven]`
- 后置种子防研磨；战斗随机源接受方签名时未知。 `[proven]`
- 内部评审无 critical / high；测试 418/418；暂无付费外部审计。 `[proven]`
- **任何审计都不消除风险**——这是实验。 `[proven]`

---

*下一步：[官方链接](official-links.md) · [合约与地址](contracts-and-addresses.md) · [法律声明](legal-disclaimer.md)*
