# 合约与地址

> [!NOTE]
> **地址的唯一权威来源**是仓库中的 `ops/ADDRESSES.md`。本页是 **t8** 的**快照**，
> 发布前请与 `ops/ADDRESSES.md` 核对。已部署地址以仓库 `ops/ADDRESSES.md` 为准。

---

## 网络

| 参数 | 值 |
|---|---|
| 类型 | Arbitrum Orbit L2 |
| **测试网 chainId（当前部署）** | **46630** |
| **主网 chainId（目标，未部署）** | **4663** |
| 原生 Gas | **ETH** |
| RPC | 以 `ops/ADDRESSES.md` / 官方公告为准 |
| 出块时间 | 约 100–250 ms `[assumed — 来自实测笔记]` |

---

## 合约清单

核心合约（Foundry 工程）： `[proven]`

| 合约 | 角色 |
|---|---|
| `Config` | 参数中心（价格、难度、费用、分配、抽水、积分等旋钮） |
| `SpiritCards` | 主 NFT：ERC-721（精简）+ ERC-2981 版税；PoW 挖矿与种子推导 |
| `ChipToken` | 筹码：ERC-1155（−30% 折扣券） |
| `StakeVault` | 质押金库（6 档权重、分红、质押卡参战） |
| `Battle` | 决斗托管与结算（createDuel / acceptDuel / cancelDuel） |
| `Points` | 链上活跃积分与排行榜数据源 |
| `Packs` | 卡包（N 张折扣铸造、保底计数） |

---

## 部署（Robinhood Chain）

部署于 **2026-10-04**（**redeploy t8**，**测试网 `chainId 46630`**；本次为**链上改名（rebrand）后的演练部署**：ERC-721 `name() = "Spirit Cards"`、`symbol() = "SPC"`，合约名 `SpiritCards`；Battle v2 = 元素 + 技能 + 结果浮动；**上级推荐 3% +
邀请人 7%**；**PvP 抽水 70% 国库 / 30% 分红池**；**难度 +0.33 位/纪元**；`eraSize = 1111`；
`masterRef` = deployer），由 deployer 部署。**`treasury` = Safe**；`Config` 所有者 =
deployer（移交 Safe 为**单独步骤**）。 `[proven]`

| 合约 / 角色 | 地址 |
|---|---|
| **Safe 2-of-3** | `0x7AC43F96021C50dC057F2F5f6fc5bAa02D4aD912` |
| Config | `0x09a24a40210BCed6e62794862175390c229Aa9b1` |
| ChipToken（ERC-1155） | `0x596FA37213781f08fD33ad5c0B7A79684852Ed01` |
| SpiritCards | `0xAb4cCECaC61Be7bEc6389FF3A215E804E1A1cD46` |
| StakeVault | `0x877E2df6691bCb1f4EECf999444B08711c89e0f8` |
| Battle | `0x72382D2e24bbEB1F89DcCF4aB8F094a7b56f54e6` |
| Points | `0x302Af8502FCa4123A715b91D3f913EAa240eFe49` |
| Packs | `0x3FDF852F2E0a0c3E934Bd03A00392f657ceb9Bb0` |

> [!WARNING]
> 上表地址 = **当前演练（rehearsal）部署**，位于**测试网 `chainId 46630`**（**t8**，2026-10-04）。
> **主网 `4663` 尚未部署，主网地址尚未公布**。主网地址公布后，以仓库 `ops/ADDRESSES.md` 为准。

---

## 已核对的关联 [proven]

| 关联 | 值 |
|---|---|
| `SpiritCards.vault()` | = StakeVault |
| `Battle.vault()` | = StakeVault |
| `StakeVault.battle()` | = Battle |
| `ChipToken.owner()` | = Safe |
| `ChipToken.minter()` | = SpiritCards |
| `Points.owner()` | = `Config.owner()` |
| `Config.treasury()` | = Safe |
| `Packs.poc()` | = SpiritCards |
| `SpiritCards.packMinter()` | = Packs |
| `SpiritCards.masterRef()` | = deployer |

---

## 参数（t8）[proven]

| 键 | 值 |
|---|---|
| `eraSize` | 1111 |
| `baseBits` | 20 |
| `bitsStepX100` | 33 |
| `eraPrice` | 0.00037 ETH |
| `priceStepBps` | 2500 |
| `maxSupply` | 8888 |
| 分配 | 6000 / 1000 / 3000 / 0 |
| `pvpRakeBps` | 1000 |
| `rakeToPoolBps` | 3000 |
| `masterRefBps` | 300 |
| `typeAdvBps` | 2000 |
| `atkVarianceBps` | 4000 |
| `lives` | 3 |

> [!NOTE]
> 更早的部署（t7 / t6 / t5 / t4 / t3 / t2）地址存放在仓库的 git 历史中。本页只列出最新 t8。

---

## 项目钱包 [proven]

| 角色 | 地址 |
|---|---|
| deployer | `0x280d1C2B20728F43d440A7449113283aD224207A` |
| signer-1 | `0xfe8FEDA23C5cB174f4F2D7DA09053d14eE963032` |
| signer-2 | `0x82a7b043eaaDB46df247869987f1A0E1D6dC752C` |
| signer-3 | `0xbc99Ead2eC29ef7bbb0098c63278fF06c6242515` |

> [!WARNING]
> **官方地址 ≠ 团队 / 个人地址。** 永远不要把两者混淆。主网钱包与 Safe 由同一脚本
> （`--chain mainnet`）单独生成，地址**不同**。

---

## 相关工具

| 工具 | 用途 |
|---|---|
| **OpenSea** | Robinhood Chain 原生市场——二级交易、5% 版税 `[proven]` |
| **RobinScan / Blockscout** | 区块浏览器（地址、交易、事件） `[proven]` |
| **推荐基金钱包** | 项目独立钱包 `[proven]` |

**不使用 Uniswap / LP**——没有 ERC-20 代币，交易只在二级市场进行。 `[proven]`

---

*下一步：[安全与所有权](security-and-ownership.md) · [官方链接](official-links.md) · [给 AI 智能体](for-ai-agents.md)*
