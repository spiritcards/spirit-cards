# 收藏与世界

## 主题

**Spirit Cards** 的世界里住着**元素灵兽**。每一张卡不是抽象的代币，而是一只**灵兽**，
它有自己所属的**元素（属性）**、战斗数值和「性格」，全部由链上种子（`seed`）确定性推导。
玩家不是买一张图，而是**挖出一只生物**。

视觉语言是收藏卡牌风格的像素画（类似宝可梦 / 卡游 Kayou）：卡框、画窗、数值面板、稀有度标签
和编号。 `[proven]`

> [!NOTE]
> 同一个代币在任何时候渲染出的形象都一致——网站、元数据、区块浏览器都从同一个种子推导，
> 所以在服务端和前端之间不会出现「图片对不上」的情况。 `[proven]`

---

## 16 个物种

第一季共有 **16 个物种**，分成两组： `[proven]`

**8 个通用物种（universal）：**

`Emberback` · `Ripplefin` · `Mossroot` · `Cloudwhisk` · `Flashbound` · `Frostpuff` · `Quicksilver` · `Moonglimmer`

**8 个龙族（attack）：**

`Cindermaw` · `Tidecoil` · `Rootwaker` · `Zephyrcrest` · `Voltrush` · `Frostmane` · `Silvervein` · `Starwisp`

每个物种是一组 PNG 图层，最终合成为一张卡。图像**确定性**地由卡牌 `seed` 组装——因此同一个
`tokenId` 永远长得一样。 `[proven]`

> [!NOTE]
> 物种的视觉分组（通用 / 龙族）是设定层面的，不等于数值层面的强弱；实战强弱来自**元素、技能和
> 数值**，而数值由种子决定。见 [生物 · 元素 · 稀有度](creatures-elements-and-rarity.md)。

---

## 元素（ELEMENT）

每张卡有 4 种元素之一，构成石头剪刀布循环： `[proven]`

| # | 元素 | EN | 克制 | 被克制 |
|---|---|---|---|---|
| 0 | 余烬 | Ember | Stone（磐石） | Tide（潮汐） |
| 1 | 磐石 | Stone | Gale（疾风） | Ember（余烬） |
| 2 | 疾风 | Gale | Tide（潮汐） | Stone（磐石） |
| 3 | 潮汐 | Tide | Ember（余烬） | Gale（疾风） |

循环：**Ember > Stone > Gale > Tide > Ember**。克制方伤害 **+20%**，被克制方 **−20%**
（参数 `typeAdvBps = 2000`）。详见 [元素与克制](../battle/elements.md)。 `[proven]`

---

## 稀有度（RARITY）

六档稀有度，从普通到顶级： `[proven]`

| # | 代号 | 名称 | 中文 |
|---|---|---|---|
| 0 | N | Common | 普通 |
| 1 | R | Rare | 稀有 |
| 2 | SR | Super Rare | 超稀有 |
| 3 | UR | Ultra Rare | 极稀有 |
| 4 | SSR | Secret Rare（整图） | 秘密稀有 |
| 5 | Prism | Prism / 1-of-1 | 棱镜 |

稀有度由种子的高位字节推导（`rarity = (seed >> 248) % 6`），并**影响数值**：稀有度越高，
基础 HP / ATK / DEF 越高。 `[proven]`

---

## 卡牌数值

从种子确定性推导： `[proven]`

| 参数 | 基础范围（未含稀有度加成） | 说明 |
|---|---|---|
| **HP** | 50–149 | `+ rarity × 15` |
| **ATK** | 8–27 | `+ rarity × 4` |
| **DEF** | 4–19 | `+ rarity × 3` |
| **Rarity** | 0–5（N…Prism） | 稀有度档 |
| **Element** | 0–3 | 元素 |
| **Skill** | 0–5 | 技能（或「无」） |

> [!WARNING]
> **数值高不等于必胜。** 战斗结果还受**元素克制（±20%）**、**技能**和**每场战斗的攻击浮动
> （±40%）**影响。数值接近时几乎是五五开。详见 [对战](../battle/README.md) 与
> [完整战例](../battle/worked-examples.md)。 `[proven]`

---

## 稀有度、变体与编号

收藏价值不只来自稀有度（以下部分为**推断**，基于对中文收藏卡市场的分析）： `[assumed]`

- **编号。** 每张卡在有限发行量里有序号（例如 `#123/8888`）。低编号和「整数」编号（#1、#100）
  被视为更珍贵。 `[assumed]`
- **成套（集齐）。** 卡牌组成不同系列；集齐一套计划给予奖励（皮肤 / 唯一物品，**不是钱**）。 `[planned]`
- **追卡（chase）。** 每季 1–2 张超稀有「目标卡」，供收藏家追逐。 `[planned]`
- **发行量透明。** 与纸质卡不同，我们的发行量**链上可查**：总共发了多少、在谁手里、战绩如何。
  这是与线下收藏卡的关键区别。 `[proven]`

> 总发行量为 **8888 张**（`maxSupply`）——这是最终的有限供应量。 `[proven]`

---

## 什么让一张卡「值得拥有」

- **进化** — 通过熔炼（2→1）提升等级与数值。 `[proven]`
- **对战** — 参战、累积胜负战绩（W/L），也可能在战斗中失去（❤×3）。见 [对战](../battle/README.md)。 `[proven]`
- **质押** — 存在金库，按权重获得分红，同时还能参战。见 [质押与分红](../economy/staking-and-rewards.md)。 `[proven]`
- **编号** — 有限发行量与序号。 `[proven]` `[assumed]`

---

*下一步：[生物 · 元素 · 稀有度](creatures-elements-and-rarity.md) · [快速上手](getting-started.md) · [术语表](../project/glossary.md)*
