# ALL_MECHANICS — Spirit Cards (SPC) · полное описание механик

> **Что это за файл.** Единый исчерпывающий обзор **всех механик** платформы: от майнинга и крафта до
> стейкинга, боёв, рефералки, экономики, онбординга и майнера. Собран **напрямую из исходников**
> (`contracts/src/*.sol`) и официального игрового гайда (`webapp/app/docs/game/game-guide.tsx`).
> Контракт — источник правды; где число — параметр контракта, оно названо по имени поля.
>
> **Теги:** `[proven]` — проверено в коде/цепи/тестах · `[assumed]` — вывод/дизайн-допущение · `[planned]` — не реализовано · `[open]` — решение владельца.
> **Обновление:** все значения отражают **стек t8** (Robinhood Chain **testnet 46630**, деплой 2026-10-04). **Mainnet 4663 — цель, ещё не задеплоен.**
>
> **Языки:** RU (этот файл). Ончейн-витрина EN + 中文 (`gitbook/en`, `gitbook/zh`).

---

## 0. Что это · петля игры

**Spirit Cards** — ончейн-мира существ-стихий. Карта — не картинка, а **персонаж со статами**, детерминированно
выведенными из ончейн-`seed`. Карту нельзя купить в магазине в общем случае — её **майнят** (реальный PoW).

```
挖 MINE  →  熔 MERGE  →  ⚔ BATTLE  →  押 STAKE  →  榜 POINTS  →  повторить
```

| Узел | Что делаешь | Что даёт |
|---|---|---|
| **Mine** | Гриндишь `nonce` → минтишь карту (настоящий PoW) | Карта + фишка + очки |
| **Merge** | Сжигаешь 2 карты → 1 сильнее (эволюция) | Сильнее карты; дефляция supply |
| **Battle** | Дуэль на ставку против другой карты | Победы, провенанс, рейк → пул |
| **Stake** | Лочишь карту в вольт на срок | Доля реальных fee; карта уходит из обращения |
| **Points** | Любое действие копит очки | Позиция в лидерборде / сезоне |

- **Сеть:** Robinhood Chain — Arbitrum Orbit L2, газ **ETH** · текущий стек — **testnet 46630**; mainnet **4663** — цель (не задеплоен). `[proven]`
- **Supply:** максимум **8888** карт (`maxSupply`), конечно; минт и сжигание только уменьшают остаток. `[proven]`
- **Ончейн-имя контракта:** `Spirit Cards` / `SPC` (ребренд выполнен 2026-10-05, t8); бренд витрины — **Spirit Cards**. `[proven]`
- **Токена проекта нет** (ERC-20 нет), **LP/Uniswap не используется**; торговля — на **OpenSea**. `[proven]`

---

## 1. Ончейн-архитектура

### 1.1 Контракты `[proven]`

| Контракт | Роль | LOC |
|---|---|---|
| **Config** | Все тюнябельные параметры + `owner` (Safe) + `paused`. Иммутабельных чисел в ядре почти нет. | 204 |
| **SpiritCards** | Ядро NFT (минимальный ERC-721 + ERC-2981): PoW-минт, MERGE, реферал, revenue-split, паки-минт, роялти. | 477 |
| **ChipToken** | ERC-1155 «фишки» (id `0`), расходник-ускоритель (−30%). Минт/сжигание — только `minter` (SpiritCards). | 102 |
| **StakeVault** | Банк карт + аккумулятор дивидендов (`accRewardPerWeight`), тиры, батчи, бой застейканной картой. | 274 |
| **Battle** | PvP v2: дуэль-эскроу на ставку, стихии, скиллы, разброс, жизни, история W/L. | 352 |
| **Points** | Очки активности + лидерборд; пишут авторизованные модули. | 44 |
| **Packs** | Покупка паков (5/10/25/50/100), минт N карт, дисконт, pity. | 71 |
| **ReentrancyGuard** | Минимальный guard без внешних зависимостей. | 15 |

### 1.2 Роли владения `[proven]` (текущий t8)

- `Config.owner` = **deployer** (на репетиции; хендовер на Safe — отдельный шаг). `[open]`
- `Config.treasury` = **Safe 2-of-3** (`0x7AC4…D912`).
- `ChipToken.owner` = **Safe**; `ChipToken.minter` = SpiritCards.
- `SpiritCards.vault` = StakeVault; `SpiritCards.masterRef` = deployer (репетиция); `packMinter` = Packs.
- `Battle.vault` = StakeVault; `StakeVault.battle` = Battle.
- `Points.owner()` = `Config.owner()` **динамически** (после хендовера переезжает на Safe автоматически).
- **Админ-функции** (`withdrawHouse/Reserve/Pool`, `setVault`, `setMasterRef`, `setSplit`, `setMining`, `paused`…) —
  только `onlyConfigOwner` (`config.owner()`).

### 1.3 Config — «ручки» (все параметры тюнябельны без редеплоя) `[proven]`

| Группа | Поле | Значение (t8) | Смысл |
|---|---|---|---|
| Mining | `baseBits` | `20` | Стартовая сложность (ведущих нулей) |
| Mining | `bitsStepX100` | `33` | +0.33 бита за ценовую эру |
| Mining | `mineCooldown` | `45` сек | Пауза между минтами на кошелёк |
| Mining | `epochCap` | `1000` карт | Макс. карт за эпоху (эмиссионный гейт) |
| Mining | `epochLength` | `3600` сек (1 ч) | Длина эпохи |
| Pricing | `eraPrice` | `0.00037 ETH` | Цена первой ценовой эры (~$1 при ETH≈$2700) |
| Pricing | `priceStepBps` | `2500` | +25 % за эру (мягко, не ×2) |
| Pricing | `eraSize` | `1111` карт | Карт в ценовой эре (8 эр × 1111 = 8888) |
| Chip | `chipDiscountBps` | `3000` | −30 % на минт с фишкой |
| Merge | `mergeFee` | `0.00002 ETH` | Fee мёрджа |
| Merge | `mergeFailBps` | `700` | 7 % «пустого» мёрджа (анти-арбитраж) |
| Split | `poolBps` | `6000` | 60 % → пул стейкеров |
| Split | `referralBps` | `1000` | 10 % → реферальный фонд |
| Split | `houseBps` | `3000` | 30 % → касса (treasury) |
| Split | `reserveBps` | `0` | 0 % → резерв |
| Supply | `maxSupply` | `8888` | Финальный тираж |
| Battle | `lives` | `3` | Стартовые «жизни» (❤) карты |
| Battle | `pvpRakeBps` | `1000` | 10 % рейк дуэли от банка |
| Battle | `rakeToPoolBps` | `3000` | 30 % рейка → пул, 70 % → касса |
| Battle | `typeAdvBps` | `2000` | ±20 % за стихию (камень-ножницы-бумага) |
| Battle | `atkVarianceBps` | `4000` | ±40 % разброс атаки на бой |
| Referral | `masterRefBps` | `300` | 3 % от gross → master-ref (с любого плательщика) |
| Royalty | `royaltyBps` | `500` | 5 % ERC-2981 → treasury |
| Staking | `tierLock[6]` | `0/7/30/90/180/365` дней | Хард-локи тиров |
| Staking | `tierWeightX1000[6]` | `1000/5000/10000/20000/30000/40000` | Вес тиров (×1…×40) |
| Points | `pointsMine/Merge/Stake/PvpWin` | `1 / 2 / 2 / 3` | Очки за действие |
| Stop | `paused` | `false` | Стоп-кран (минт/мёрж/стейк/бой/паки) |

---

## 2. MINE — майнинг (PoW)

### 2.1 Формула PoW `[proven]`
```
work  = keccak256(chainId ‖ contract ‖ miner ‖ nonce)
valid ⟺ leadingZeroBits(work) ≥ requiredBits()
```
- `leadingZeroBits` — число **ведущих нулевых бит** хеша.
- `requiredBits()` = `baseBits + era × bitsStepX100 / 100`, где `era = paidMinted / eraSize`. Сложность растёт **только с ценовой эрой**, не от минтов.
- **Храповика сложности нет** (урок S1): темп задаёт **протокол** (эмиссионный гейт + цена), а не гонка хешрейта.
  Телефон и ферма получают **одинаково** на карту. `[proven]`
- Гриндинг `nonce` — **офчейн и бесплатен**; on-chain платишь только при минте. Событие `Mined` несёт тот же `work`,
  что считает CLI-майнер (байт-в-байт). `[proven]`

### 2.2 Поток `mine(nonce, useChip)` `[proven]`
1. Проверки: `!paused`, `totalMinted+1 ≤ maxSupply` (иначе `SOLD_OUT`), эпоха (`EPOCH_FULL`), cooldown (`COOLDOWN`).
2. Проверка PoW (`BAD_POW`) и что `nonce` не использован этим кошельком (`NONCE_USED`).
3. Цена `currentPrice()`; если `useChip` — списать 1 фишку и применить `−chipDiscountBps`.
4. `msg.value == due`; помечаем `nonce` использованным, обновляем `lastMintAt`, эпоху, `totalMinted`, `paidMinted`.
5. **Фишка:** полный минт (без фишки) → `chip.mint(1)`; минт со скидкой → только **потребляет** фишку.
6. Минт `id = totalMinted`; **сид печатается сразу**: `seedOf[id] = keccak256(prevrandao, msg.sender, nonce, id)`.
7. `points.addPoints(pointsMine, "MINE")`; событие `Mined`; `_split(due, msg.sender)` — распределение выручки.

### 2.3 Цена и ценовые эры `[proven]`
```
currentPrice() = eraPrice × (1 + priceStepBps/10000)^era   // era = paidMinted / eraSize, cap 64
```
- Старт ≈ `0.00037 ETH` (~$1); **+25 % за эру**; при `eraSize=1111` и `maxSupply=8888` — **≈8 эр** до нескольких долларов.
- Мягкий шаг (не ×2) → минт **никогда не «обгоняет» флор**. `[assumed]` (экономический вывод, см. `03_ECONOMY.md`).

### 2.4 Anti-drain (без храповика) `[proven]`
1. **Глобальный эмиссионный гейт** (`epochCap` карт/`epochLength`) — темп задаёт протокол, не флот.
2. **Per-wallet cooldown** (`mineCooldown`) — режет одиночный спам.
3. **Фикс-низкая, мягко растущая цена** — нет «гонки на дно».
4. **Конечный `maxSupply`** + дефляция (мёрдж/бой).

### 2.5 Фишки (ChipToken, ERC-1155) `[proven]`
- `CHIP = 0`. Платный минт → **+1 фишка**. Минт с фишкой → **−30 %** и фишка **сжигается**.
- Фишка со скидкой **не выдаёт** новую (иначе скидка была бы вечной).
- Только `minter` (SpiritCards) может `mint/burn`. Floor-цена фишки — утилити замкнута на минт.

---

## 3. Карта: сид, статы, редкость, стихии, скиллы

### 3.1 Сид `[proven]`
- `seedOf[id]` пишется **при минте**: `keccak256(prevrandao, msg.sender, nonce, id)`.
- Для мёрдж-ребёнка — `keccak256(seedOf[a], seedOf[b], prevrandao, msg.sender)`.
- Для пака — `keccak256(prevrandao, to, id, i)`.
- **Редкость нельзя предугадать до включения** (post-inclusion). `[proven]`
- Витрина рендерит карту **детерминированно** из сида — токен выглядит одинаково в приложении, метаданных и explorer. `[proven]`

### 3.2 Боевые статы (вывод из сида, `Battle.statsOf`) `[proven]`
```
rarity = (seed >> 248) % 6
atk    = 8  + ((seed >> 240) & 0xFF) % 20 + rarity*4      // 8..27 + бонус
def    = 4  + ((seed >> 232) & 0xFF) % 16 + rarity*3      // 4..19 + бонус
hp     = 50 + ((seed >> 224) & 0xFF) % 100 + rarity*15    // 50..149 + бонус
element = (seed >> 216) & 0x03                             // 0..3
skill   = (seed >> 208) % 6                                // 0..5
```
- Паритет: та же формула на фронте (`webapp/lib/seed-traits.ts`) — карта одинакова везде. `[proven]`

### 3.3 Редкость `[proven]`
Тиры (6): **Common (N) → Rare (R) → Super Rare (SR) → Ultra Rare (UR) → Secret Rare (SSR) → Prism**.
Читается из верхних бит сида; **масштабирует** базовые HP/ATK/DEF. Prism задуман как 1-of-1. `[assumed]`/`[open]` — точные тиражи.

### 3.4 Стихии — ДВА разных понятия (не путать!)
- **Визуальные 8 «элементов жизни»** (косметические стихии существ, лендинг/`ELEMENTS` в `ui.tsx`): Ice/Frostpuff,
  Magma/Emberback, Moss/Mossroot, Spark/Flashbound, Celestial/Moonglimmer, Storm/Cloudwhisk, Tide/Ripplefin,
  Metal/Quicksilver. `[proven]` (визуал/бренд).
- **4 боевые стихии** (влияют только на `Battle`): `0 Ember › 1 Stone › 2 Gale › 3 Tide › 0 Ember`
  (`_beats(x,y) ⟺ y == (x+1) % 4`). `[proven]`

### 3.5 Скиллы (5 + «нет») `[proven]`

| # | Скилл | Эффект |
|---|---|---|
| 0 | None | — |
| 1 | Crit | 20 % шанс ×2 урона |
| 2 | Shield | Входящий урон −30 % |
| 3 | Pierce | Игнорирует DEF защитника |
| 4 | Precision | +15 % урона всегда |
| 5 | Vigor | +20 % макс. HP |

Скилл выводится из сида — **игрок не выбирает**. `[proven]`

### 3.6 Виды (species) — 16 `[proven]`
- **8 universal:** Emberback · Ripplefin · Mossroot · Cloudwhisk · Flashbound · Frostpuff · Quicksilver · Moonglimmer.
- **8 attack-драконов:** Cindermaw · Tidecoil · Rootwaker · Zephyrcrest · Voltrush · Frostmane · Silvervein · Starwisp.
- Арт: конвейер `seed → traits → PNG` (512 слоёв, v7). `[proven]`

---

## 4. MERGE (熔) — крафтинг/эволюция

### 4.1 Поток `mergeBurn(a, b)` `[proven]`
1. Проверки: `!paused`, `a != b`, оба — твои (`NOT_OWNER`), `msg.value == mergeFee`.
2. `s = keccak256(seedOf[a], seedOf[b], prevrandao, msg.sender)` — **post-inclusion** (нельзя предсказать пару).
3. Обе карты **сжигаются** (`burned += 2`).
4. **Dud-ролл:** `roll = keccak256(s,"DUD") % 10000`; если `roll < mergeFailBps` (7 %) — **ничего не минтится**
   (обе сгорели) → `Merged(a,b,0,fee)` и раздел fee. Анти-арбитраж «2×N всегда < N+1». `[proven]`
5. Иначе: `forgeCounter++`, **ребёнок id = `10 000 000 + forgeCounter`** (отдельный namespace), `forged++`,
   `seedOf[id] = s`. Событие `Merged(a,b,id,fee)`; `_split(fee, msg.sender)`. `pointsMerge` очков.

### 4.2 Свойства `[proven]`
- **2 → 1**, дефляция: `totalForged ≤ totalBurned` (нетто −1 за операцию).
- Ребёнок — **сдвиг по сиду** (эволюция), не детерминированный +1.
- Нельзя мёрджить карту с собой, чужую или **застейканную** (застейканная во владении вольта). Атомарно.
- `mergeFailBps = 0` отключает dud.

---

## 5. STAKE (押) — «回本»-движок / банк карт

### 5.1 Тиры и веса `[proven]` (читаются из Config on-chain)

| Тир | Лок | Вес (×1000) | Множитель |
|---|---|---|---|
| t0 | flexible (0 дней) | 1000 | ×1 |
| t1 | 7 дней | 5000 | ×5 |
| t2 | 30 дней | 10000 | ×10 |
| t3 | 90 дней | 20000 | ×20 |
| t4 | 180 дней | 30000 | ×30 |
| t5 | 365 дней | 40000 | ×40 |

- t0 — гибкий (снять в любой момент); t1–t5 — **жёсткий лок** (`unstake` ревертит `LOCKED` до срока).

### 5.2 Механика дивидендов `[proven]`
- Карта **переводится в StakeVault** (`nft.transferFrom` → vault). Требуется `setApprovalForAll(vault, true)` на NFT.
- Модель **lump-sum по весу** (`accRewardPerWeight`, масштаб `1e18`):
  - `notifyRewards()` — приток в пул; если стейкеров нет → копится в `undistributed`;
  - при появлении стейкера `undistributed` распределяется; первый стейкер забирает накопленное.
- `pending(tokenId) = weight × acc/1e18 − rewardDebt`; `rewardDebt` округляется **вверх** (`_mulDivCeil`) — убивает
  1-wei «недосчёт» солвентности (пойман fuzz-инвариантом). `[proven]`
- `claim(tokenId)` — забрать без анстейка; `stake/stakeBatch/claimBatch/unstakeBatch` — батчи (атомарные). `[proven]`
- `pointsStake` очков за стейк (× кол-во карт в батче).

### 5.3 Пул `[proven]`
- Наполняется долей fee (60 % минт/мёрж/пак) + внешним рейком боя (30 %) + спонсорами `[planned]`.
- `SpiritCards.pumpPool()` — **permissionless keeper**: переливает `accruedPool` в `notifyRewards()` вольта;
  деньги всегда идут в вольт, **никогда — вызывающему**. Запускается cron'ом (`ops/keeper.sh`).
- `withdrawPool(to)` — только владелец (альтернативный путь).

### 5.4 Честное предупреждение `[proven]`
Пул привязан к **реальной активности**: нет fee → нет притока → выплаты падают до нуля. Это **revenue-share**,
не «процент на депозит». Ни APY, ни收益率, ни сроков окупаемости не публикуется и не гарантируется.

### 5.5 Бой застейканной картой `[proven]`
См. §6.4 — застейканная карта **не покидает вольт**, только лочится (`lockForBattle`); дивиденды идут; NFT-approve не нужен.

---

## 6. BATTLE (⚔) — PvP v2

### 6.1 Формат дуэли `[proven]`
- `createDuel(cardA, stake)` — создаёшь **открытую** дуэль: карта + ставка в эскроу. `stake > 0`, `msg.value == stake`.
- `acceptDuel(id, cardB)` — принимаешь: своя карта + **такая же** ставка; бой резолвится **в той же транзакции**.
  Нельзя принять свою дуэль (`SELF`).
- `cancelDuel(id)` — отменить собственную открытую дуэль (карта + ставка возвращаются).
- Банк `pot = stake × 2`.

### 6.2 Разрешение боя `_resolve` `[proven]`
- Базовые статы из сида + **стихия** + **скилл** + **разброс**:
  - `atkVarianceBps = 4000` → атака × `(10000 ± 4000)/10000` (по сиду + `prevrandao` + id);
  - стихия: преимущество `+typeAdvBps`, недостаток `−typeAdvBps` (±20 %);
  - Vigor: +20 % макс. HP.
- Раунды (до 64), стороны бьют по очереди (`_strike`):
  ```
  effAtk = atk × multBps / 10000
  Pierce  → def = 0
  base    = effAtk − def/2   (минимум 1)
  Precision → base ×1.15
  Crit (rng%5==0) → base ×2
  Shield (получатель) → base ×0.7
  ```
- HP противника = 0 → победа бьющего. Если 64 раунда истекли — сравнение **доли** остаточного HP
  (кросс-умножение без деления), затем `rng & 1` как полный тай-брейк.
- **RNG:** `keccak256(seedA, seedB, id, block.prevrandao, battle)`. Исход зависит от `prevrandao` **блока-исполнителя**,
  который принимающий **не знает в момент подписи** → нельзя выбрать гарантированный победный момент. `[proven]`
- `preview(a,b,id)` — предпросмотр по текущему `prevrandao` (для UI/тестов; не гарантия).

### 6.3 Вероятности `[proven]` (по гайду)
- ±40 % разброс + ±20 % стихия + скиллы → исход **лотерея**:
  - равные карты ≈ **монетка**;
  - карта на **+25 % силы выигрывает ≈72 %** (андердог ≈28 %);
  - явно сильная карта выигрывает почти всегда.

### 6.4 Эскроу и застейканные карты `[proven]`
- Кошелёчная карта → `transferFrom` в Battle (эскроу).
- Застейканная карта (во владении вольта) → только `vault.lockForBattle` (**не покидает вольт**), возврат `unlockFromBattle`.
  Дивиденды продолжают капать; NFT-approve не нужен. `_stakedBy(card, who)` проверяет `ownerOf == vault && stakerOf == who`.

### 6.5 Жизни и сжигание `[proven]`
- У каждой карты **3 жизни** (`config.lives()`). Проигравший теряет **1 жизнь**.
- **0 жизней → карта сжигается** (реальный sink): кошелёчная — `poc.burnCard`; вольтовская — `vault.killInBattle`
  (сжигает, **сначала выплачивает** незаклеймленные дивиденды стейкеру, чистит стейк).
- `lives(card)` возвращает 0 для сожжённой; флаг `burned[card]`.
- **История:** `wins[card]` / `losses[card]` растут — провенанс/«легенда» карты. `[proven]`

### 6.6 Рейк и расчёт `[proven]`
- `rake = pot × pvpRakeBps/10000` = **10 % банка**.
- Расщеп: `rakeToPoolBps = 3000` → **30 % в пул** (`poc.addToPool`), **70 % в treasury** (`config.treasury`).
- Победитель получает `pot − rake` (+1 win, `pointsPvpWin` очков). Дуэль — **нулевая сумма между игроками + рейк**, не понци.
- Рейк — **внешняя выручка** (не из минтов) → питает пул стейкеров.

---

## 7. PACKS (卡包) — покупка паков

### 7.1 Размеры и дисконты `[proven]`

| Пак | Карт | Дисконт (`discountBps`) |
|---|---|---|
| 0 | 5 | 3 % |
| 1 | 10 | 6 % |
| 2 | 25 | 12 % |
| 3 | 50 | 20 % |
| 4 | 100 | 30 % |

- `priceFor(i) = currentPrice() × size[i] − discount`.
- `buyPack(i)`: оплата → `poc.mintPack(msg.sender, size[i])` (минтит N **реальных** карт, обычные id/редкость/права)
  → `poc.collectRevenue{value}(msg.sender)` (тот же сплит pool/ref/house).
- **Обходит PoW, эпоху и cooldown** — это и есть продукт. Нельзя принять **твою** дуэль/пак сверх `maxSupply` (`SOLD_OUT`). `[proven]`
- `packsBought[user]`, `pity[user]` (счётчик пуков; `resetPity` владельцем). `[proven]`
- Честно: пак **не гарантирует** конкретную карту и не даёт окупаемости; цену задаёт рынок. `[proven]`

---

## 8. POINTS (榜) — очки и лидерборд

### 8.1 Начисление `[proven]`

| Действие | Очки | Поле |
|---|---|---|
| Mine | 1 | `pointsMine` |
| Merge | 2 | `pointsMerge` |
| Stake | 2 | `pointsStake` (× кол-во в батче) |
| PvP win | 3 | `pointsPvpWin` |

- Пишут **авторизованные** модули (SpiritCards, StakeVault, Battle) через `Points.addPoints`.
- Хранится ончейн `points[address]`; событие `PointsAdded(user, amount, reason)` — активность верифицируема.
- **Сезоны** — офчейн (по снапшотам), лишь сбрасывают лидерборд; коллекция не ротируется. `[proven]`
- **Очки не имеют денежной ценности**; награды сезона — скины/уники, не деньги. `[proven]`
- Защита от ботов: минт-очки по замыслу с капом/кошелёк; лидерборд-гигиена — `[assumed]`/`[open]`.

---

## 9. Реферальная система (传帮带)

### 9.1 Правила `[proven]`
- `setReferrer(ref)` — **один раз** навсегда (`referrerOf`); нельзя себя (`SELF`), нуль (`ZERO`), и **`ref` должен
  иметь ≥1 минт** (`_balanceOf[ref] > 0`, иначе `REF_NO_MINT`).
- Награда — **% от ВСЕХ действий реферала** (мины/мёрж/стейк/пак/PvP), **не от депозита** — не понци. `[proven]`

### 9.2 Расщеп 10 % реферального фонда `_split` `[proven]`
```
toReferral = amount × referralBps/10000      // 10 %
toMaster   = amount × masterRefBps/10000      // 3 % gross → masterRef (фикс. топап)
toReferrer = toReferral − toMaster            // 7 % → реферер плательщика
```
- **masterRef** — фиксированный верхний реферер **для каждого плательщика** (даже без своего реферала).
- Если `masterRef == 0` → выреза нет, реферер получает все 10 %.
- Если у плательщика **нет** реферера — 7 % остаются в **неразделённом фонде** (`accruedReferral − referralOutstanding`).
- `claimReferral()` — реферер забирает `referralEarned`; `referralOutstanding` защищает уже начисленное.
- `withdrawReferralLeftover(to)` — владелец может снять **только излишек** без получателя; начисленное неприкосновенно. `[proven]`

### 9.3 Красные линии `[proven]`
**Никаких «% с депозита реферала»** — только % от реальной активности (CN-красная линия). Вестинг/кап рефералов — `[planned]`/`[open]`.

---

## 10. Экономика: split, роялти, пул

### 10.1 Revenue split `_split` (каждый fee) `[proven]`
```
toPool    = amount × poolBps/10000      // 60 %  → дивиденды стейкеров
toReferral= amount × referralBps/10000  // 10 %  → реферальный фонд (см. §9)
toHouse   = amount × houseBps/10000     // 30 %  → treasury (касса/команда)
toReserve = amount − …                  //  0 %  → резерв
```
- Применяется к: минтам, мёрджу, выручке паков (`collectRevenue`).
- `withdrawHouse` / `withdrawReserve` — владелец. `pumpPool` — permissionless (в пул).

### 10.2 Источники `[proven]`
Mint (`eraPrice/эра`) · Merge fee · Packs (дисконт) · **PvP rake** (10 %, 30 % в пул) · **Royalty** (5 % ERC-2981).
Роялти идёт **в treasury, НЕ в пул**; вторичка — на OpenSea. `[proven]`

### 10.3 Что наполняет пул `[proven]`
60 % минтов + 60 % мёрджа + 60 % паков + 30 % рейка боя + спонсоры `[planned]`. Роялти — не в пул.
Приток → `SpiritCards.accruedPool` → `pumpPool()` → `StakeVault.notifyRewards()`.

### 10.4 Роялти ERC-2981 `[proven]`
`royaltyInfo → receiver = config.treasury, amount = salePrice × royaltyBps/10000` (5 %). Receiver — **динамически** из Config.

### 10.5 Анти-понци (жёстко) `[proven]`
- Нет гарантированной доходности, нет APY/收益率/«回本 гарантирован».
- Дивиденды — **только из реальных fee**; нет fee → нет выплат.
- Нет «% с депозита», нет wash-объёма/самотрейда, нет ручного флор-пуша.
- Дисклеймер: «эксперимент/игра; points не имеют денежной ценности; доходность не гарантирована».

---

## 11. Онбординг (2 режима, кошелёк без сида)

`[planned]`/`[open]` — по `10_ONBOARDING_AND_WORKER.md`:

1. **「连接钱包 / Connect Wallet」** — MetaMask/OKX/Rabby/TG: стандартный connect для опытных.
2. **「一键开始 / Play」** — Face ID/отпечаток или email/Google → **умный аккаунт (ERC-4337)** **без сид-фразы**
   (passkey в чипе / MPC-шара, social recovery).
3. **Спонсорский первый минт (Paymaster):** газ оплачивается из кассы, первый минт бесплатно; но **PoW-гриндинг
   всё равно нужен** («я добыл», не «конфету дали»). Анти-абьюз: 1 спонсорский/аккаунт, кап спонсорских, PoW-порог.

Технология: Privy / Web3Auth / Safe+passkey — `[open]` (провайдер, бюджет).

---

## 12. Майнер (CLI / браузер / фермы)

- **Браузерный** (`webapp/lib/mining-engine.ts` + `useMining.ts`): авто-майнинг как **процесс-singleton** —
  переживает навигацию; глобальный индикатор «Mining»; авто-цикл grind → авто-минт → cooldown. `[proven]`
- **CLI** (`miner/mine.mjs`, `pow.mjs`): работает байт-в-байт как ончейн; `measure.html` — бенчмарк телефона (211 kH/s). `[proven]`
- **Фермы:** публичный GitHub-майнер (CLI + GPU) — ферма находит nonce быстрее, но **экономического преимущества нет**
  (та же цена/cooldown/гейт на кошелёк) — только удобство. `[assumed]`
- **Облачный воркер** (non-custodial): сервер ищет nonce за твой **публичный адрес**, минт подписываешь ты; ключи не уходят.
  На старте — как мобильный путь; монетизация — `[open]`. `[planned]`

---

## 13. Инварианты и безопасность `[proven]`

- `totalSupply ≤ maxSupply`; нет underflow.
- `totalForged ≤ totalBurned` (мёрдж-дефляция).
- `requiredBits` растёт только от ценовой эры (нет функции, меняющей её от минтов).
- Сумма `feeSplit = 10000`; `treasury ≠ 0`; `mineCooldown > 0`; `chipDiscountBps < 10000`.
- Стейк-вес монотонен по тиру; `Staked/Unstaked` учитываются движком очков.
- Ни один fee не платит «гарантированную доходность» — только pro-rata пула.
- **CEI** на минтах/мёрджах; `ReentrancyGuard` на всех ETH-шлющих функциях.
- Реферальный «излишек» отделён от начисленного (`referralOutstanding`).
- Мёрдж-ребёнок/пак-сид — post-inclusion (не предсказуемы).
- **Тесты: 418/418** (fuzz + инварианты + edge-cases + audit-fixes + ref/rake/bits + стейк-бой). `[proven]`
- Аудит: `audit/SMART_CONTRACT_SECURITY_REVIEW.md`; внешний аудит перед мейннетом — `[open]`.

---

## 14. Полная таблица «узлов» (сводка)

| Узел | Вход | Выход | Fee | Очки | Тюнинг (Config) |
|---|---|---|---|---|---|
| **Mine** | nonce (PoW) + цена (+опц. фишка) | карта + фишка | цена × split | +1 | baseBits, bitsStep, cooldown, epoch, цена, chip |
| **Merge** | 2 карты + fee | 1 карта (или dud) | mergeFee × split | +2 | mergeFee, mergeFailBps |
| **Stake** | карта + тир | доля пула | — | +2 | tierLock[6], tierWeight[6] |
| **Battle** | 2 карты + 2×ставка | банк − рейк; ±жизнь | 10 % рейк (30/70) | +3 победителю | lives, pvpRake, rakeToPool, typeAdv, atkVariance |
| **Packs** | цена − дисконт | N карт | цена × split | — | size[5], discountBps[5] |
| **Referral** | setReferrer (1×) | % от активности | из 10 % фонда | — | referralBps, masterRefBps |
| **Points** | действия | лидерборд | — | — | points* |

---

## 15. Что НЕ реализовано / открыто (`[planned]` / `[open]`)

- Ончейн-ребренд в «Spirit Cards» (`name`/`symbol`) — **выполнен (t8, 2026-10-04)**: `name`=«Spirit Cards», `symbol`=«SPC». `[proven]`
- Хендовер `Config` → Safe + тимелок — `[open]`.
- verify + OpenSea-профиль + домен (`spiritcards.fun`) — `[open]`, не делаем без команды.
- Внешний аудит / bug-bounty — `[open]`.
- Спонсорский минт (Paymaster) и embedded-wallet онбординг — `[planned]`.
- Облако-майнинг как мобильный путь + монетизация — `[open]`.
- Реген HP за стейк/фишку — обсуждалось, в контракте **нет** (жизни дискретные) — `[open]`.
- Serge/эпохи, таблица тиражей по тирам, pull-rate ончейн vs дашборд — `[open]`.
- Пулы резерва (сейчас `reserveBps = 0`) — выкуп/сжигание/приз-фонд — `[open]`.

---

## Приложение. Файлы-источники
- Контракты: `contracts/src/{Config,SpiritCards,ChipToken,StakeVault,Battle,Points,Packs,ReentrancyGuard}.sol`
- Тесты: `contracts/test/*.t.sol` (418)
- Гайд: `webapp/app/docs/game/game-guide.tsx` · Витрина: `webapp/`, `webapp/lib/*`
- Доки: GitBook EN/中文 (источники в этом репо — `gitbook/en/`, `gitbook/zh/`)
- Адреса: `webapp/lib/canonical.ts` (канон фронта) · публичный справочник — GitBook (project/contracts-and-addresses)

---
*Файл-справочник. Числа — параметры контракта (тюнябельны через Config). Теги `[proven]`/`[assumed]`/`[planned]`/`[open]` отражают состояние кода, а не обещания.*
