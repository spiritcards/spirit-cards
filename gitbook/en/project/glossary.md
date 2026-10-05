# Glossary

Key terms in **English / Русский / 中文**.

---

## Core concepts

| English | Русский | 中文 | Meaning |
|---|---|---|---|
| **Spirit Cards** | Spirit Cards | Spirit Cards | The game / collection and its on-chain name |
| **SPC** | SPC | SPC | On-chain ticker (`symbol()` = SPC) for the collection |
| **Card** | Карта | 卡牌 | A collectible creature NFT (ERC-721) |
| **Seed** | Сид / семя | 种子 | 32-byte on-chain value all traits derive from |
| **Mine** | Майнить / 挖 | 挖矿 | Produce a card via proof-of-work |
| **Merge** | Мердж / сплав | 熔合 | Burn 2 cards → 1 higher-level (forged) card |
| **Battle** | Бой | 对战 | Escrow duel on a stake |
| **Stake** | Стейк / стейкинг | 质押 | Lock a card for a share of the pool |
| **Points** | Очки | 积分 | On-chain activity score (no monetary value) |

## Traits

| English | Русский | 中文 | Meaning |
|---|---|---|---|
| **Rarity** | Редкость | 稀有度 | N / R / SR / UR / SSR / Prism |
| **Species** | Вид | 种类 | 16 creature types (8 universal + 8 dragons) |
| **Element** | Стихия | 元素 | Ember / Stone / Gale / Tide |
| **Skill** | Навык | 技能 | none / Crit / Shield / Pierce / Precision / Vigor |
| **HP / ATK / DEF** | Здоровье / Атака / Защита | 生命 / 攻击 / 防御 | Battle stats |

## Battle

| English | Русский | 中文 | Meaning |
|---|---|---|---|
| **Duel** | Дуэль | 决斗 | A battle between two cards on a stake |
| **Escrow** | Эскроу | 托管 | Card/stake held by the Battle contract |
| **Pot** | Банк | 底池 | `2 × stake` |
| **Rake** | Рейк | 抽成 | 10% of the pot, taken by the house |
| **Life (❤)** | Жизнь | 生命次数 | A card has 3; 0 → burn |
| **Burn** | Сжигание | 销毁 | Permanently destroy a card |
| **Variance** | Разброс | 波动 | ±40% per-battle attack roll |
| **Crit** | Крит | 暴击 | 20% chance to deal ×2 |
| **Shield** | Щит | 护盾 | −30% incoming damage |
| **Pierce** | Прокол | 穿透 | Ignores defender DEF |
| **Precision** | Точность | 精准 | +15% damage always |
| **Vigor** | Живучесть | 强韧 | +20% max HP |

## Economy

| English | Русский | 中文 | Meaning |
|---|---|---|---|
| **Era** | Эра | 阶段 | 1111 cards; price +25% and difficulty +0.33 bit per era |
| **Price** | Цена | 价格 | Mint price; starts 0.00037 ETH, +25%/era |
| **Chip** | Фишка | 筹码 | ERC-1155 coupon (−30% on next mint) |
| **Pack** | Пак | 卡包 | Bundle of 5/10/25/50/100 cards at a discount |
| **Pool** | Пул | 奖池 | Staker reward pool (fee-funded) |
| **Dividend** | Дивиденд | 分红 | A staker's share of the pool (no guarantee) |
| **Split** | Сплит | 分配 | pool 60% / referral 10% / treasury 30% |
| **Referral** | Реферал | 推荐 | Share of the referral fund (master 3% + referrer 7%) |
| **Royalty** | Роялти | 版税 | 5% ERC-2981 on secondary sales |

## Technical

| English | Русский | 中文 | Meaning |
|---|---|---|---|
| **Config** | Config | 配置 | Central tunable-parameter contract |
| **StakeVault** | StakeVault | 质押金库 | Staking contract |
| **Nonce** | Nonce | 随机数 | The number you search for when mining |
| **Difficulty (bits)** | Сложность | 难度 | Required leading zero bits |
| **Cooldown** | Кулдаун | 冷却 | 45 s between mints per wallet |
| **Epoch** | Эпоха | 周期 | 3600 s window with a mint cap |
| **Safe (2-of-3)** | Safe (2 из 3) | 多签钱包 | Multisig intended to own Config |
| **Seed-derived** | Из сида | 由种子推导 | Computed deterministically from the seed |
| **Zero-sum** | Нулевая сумма | 零和 | PvP: one side's gain is the other's loss (+rake) |

## Phrases used in this book

| English | Русский | 中文 |
|---|---|---|
| "Mine, don't buy" | «Добывай, а не покупай» | 「挖矿，而非购买」 |
| "No guaranteed return" | «Нет гарантированной доходности» | 「无保证收益」 |
| "Points have no monetary value" | «Очки не имеют денежной ценности» | 「积分无货币价值」 |
| "A game, not an investment" | «Игра, а не инвестиция» | 「是游戏，不是投资」 |

---

## Next

- **[For AI agents](for-ai-agents.md)**
- **[FAQ](faq.md)**
- **[Legal disclaimer](legal-disclaimer.md)**
