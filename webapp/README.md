# Spirit Cards — webapp (Next.js)

Frontend for **Spirit Cards** (ticker `SPC`) — коллекционные карты-существа со статами,
добываемые **PoW-майнингом** на **Robinhood Chain** (live-стек — mainnet `4663` (**t9**, задеплоен 2026-10-05);
`46630` — репетиция). Читает/пишет
контракты через [viem]; картинка и метаданные детерминированно рендерятся из он-чейн `seedOf`.

> **Live:** https://spiritcards.fun (домен live с 05.10; legacy Vercel-алиас проекта оставлен как вторичный, не каноничный).
> Адреса контрактов — `lib/canonical.ts` (канон фронта); публичный справочник — GitBook (project/contracts-and-addresses).

## Стек
- **Next.js 15** (App Router) + **React 19** + TypeScript
- **viem 2** (chain def, reads/writes, multicall-батчинг)
- **Tailwind v4** (дизайн-система «Ore & Elements»: `app/spirit.css`, `app/layers.css`) + легаси-слой `@layer legacy`
- `sharp` — серверный рендер PNG карты из seed (траits → слои)

## Быстрый старт
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # прод-сборка
npm start          # отдать прод-сборку
npm run check:addresses   # гейт: каноничные адреса не разъехались по файлам
```
Env опционален — sane-дефолты RH зашиты. Пример: `.env.local.example`. Ключевые переменные:

| Переменная | Назначение |
|---|---|
| `NEXT_PUBLIC_RH_RPC_URL` / `_EXPLORER_URL` / `_CHAIN_ID` / `_IS_TESTNET` | сеть RH (mainnet `4663` по умолчанию) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | override адреса `SpiritCards` (дефолт из `lib/canonical.ts`) |
| `NEXT_PUBLIC_SITE_URL` | каноничный URL (sitemap / llms.txt / JSON-LD) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | опц. — включает мобильный QR-пейринг |
| `NEXT_PUBLIC_X_URL` / `_GITHUB_URL` / `_TELEGRAM_URL` / `_OPENSEA_URL` | официальные ссылки (`lib/site.ts`, `SOCIAL_LINKS`) |
| `NEXT_PUBLIC_PREVIEW_CAP` | детерминированные превью-карты, пока коллекция пуста (0 = off) |

## Разделы (app/)
| Route | Описание |
|---|---|
| `/` | лендинг (hero, The Elemental Loop, Collection Preview, Elements of Life, Live on Chain) |
| `/mine` | Mining Console: цена, next era, сложность/PoW, **авто-майнинг в фоне**; панель Packs; кнопка OpenSea |
| `/collection` | обзор всех видов (16) + фильтр по стихиям; `/profile` — карты кошелька |
| `/stake` | селектор тиров (6 «печатей») + live-payoff; батч stake/claim/unstake |
| `/battle` | дуэли (create/accept/cancel), рейтинг, карты из стейка |
| `/merge` | MERGE 2→1 |
| `/points` | лидерборд очков; `/pool` — дашборд эмиссии/пула; `/stats`, `/claim`, `/token/[id]` |
| `/docs`, `/zh/*` | документация (EN + ZH) |

### API (`app/api/`)
| Route | Описание |
|---|---|
| `/api/image/[id]` | детерминированный PNG карты из он-чейн seed (слои `/poc-art`) |
| `/api/preview/[species]` | превью вида (16 видов) |
| `/api/sample/[n]` | сэмпл-карты |
| `/api/meta/[id]` | OpenSea-совместимые метаданные из seed |
| `/api/points`, `/api/pool`, `/api/recent` | очки / статистика пула / последние минты |
| `/llms.txt`, `/llms-full.txt`, `/index.md`, `/mine.md`, `/.well-known/ai.json`, `/openapi.yaml` | AI-дискавери и markdown-версии |

## Арт-конвейер (seed → traits → PNG)
- **16 видов:** 8 universal (Emberback/Ripplefin/Mossroot/Cloudwhisk/Flashbound/Frostpuff/Quicksilver/
  Moonglimmer) + 8 attack-драконов (Cindermaw/Tidecoil/Rootwaker/Zephyrcrest/Voltrush/Frostmane/
  Silvervein/Starwisp). Слои — `public/poc-art/{universal,attack}/` (PNG).
- **Каталог:** `scripts/build-catalog.mjs` → `lib/poc-art.catalog.json` + `public/poc-art/catalog.json`.
- **Рендер:** `lib/seed-traits.ts` + `lib/card-art.ts` (серверный `sharp`).

## Рантайм майнинга
- `lib/mining-engine.ts` — **процесс-singleton** (авто-цикл: grind → авто-минт → cooldown → grind),
  живёт при навигации по сайту; `lib/useMining.ts` — React-биндинг (`useSyncExternalStore`).
- `lib/pow.ts` / `lib/miner-client.ts` — воркер PoW (keccak); work совпадает с он-чейн.

## Известные долги
- `/api/image/[id]` — пока `force-dynamic` без серверного кэша (LRU по `seed+width` — в TODO).
- Легаси-CSS в `@layer legacy` (полное сворачивание S1-стилей — в TODO); коллизия класса `grid` ↔
  легаси `.grid` в ~7 файлах. MCP-deps: `mcp-handler` + `zod` используются read-only-сервером `/api/mcp`
  (`app/api/mcp/route.ts`); `@modelcontextprotocol/server` в webapp не импортируется — только в standalone-репо
  `spirit-cards-mcp`.
- `check:traits*` / `render:uniques` — скрипты от мёртвой эпохи (импортируют отсутствующие `lib/traits*`).

[viem]: https://viem.sh
