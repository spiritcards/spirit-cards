# PLACEHOLDERS — Spirit Cards web (проверить перед лончем)

> Файл-напоминалка: места, где стоят **заглушки** вместо реальных ссылок/контактов
> проекта. Создано 2026-09-25 при зачистке ссылок Season 1 (Proof of Architect /
> `@proof_of_arc` / `github.com/Proofofarchitect`).
> Когда реальные значения появятся — заменить здесь отмеченное и удалить строку из таблицы.

## Заглушки (нужно проставить актуальную ссылку проекта)

| Файл | Что | Сейчас (заглушка) | Нужно |
|---|---|---|---|
| `app/site-footer.tsx` | `X_URL` | `https://x.com/spirit_card` | ✅ live (05.10) |
| `app/site-footer.tsx` | `GITHUB_URL` | `https://github.com/spiritcards` | ✅ live |
| `app/docs/agent-access/agent-access-content.tsx` | MCP-доступ | hosted live: `/api/mcp`; standalone `spirit-cards-mcp` (репо приватное) | опубликовать `spirit-cards-mcp` в npm (`npx` пока не работает, npm 404) |
| `public/.well-known/security.txt` | `Contact` | `https://github.com/spiritcards/spirit-cards/security/advisories/new` + `https://t.me/spirit_cards_game` | ✅ live (05.10) — без security-mailbox |
| `public/.well-known/security.txt` | `Canonical` | `https://spiritcards.fun/...` | ✅ 05.10 |

## Проверить (вероятно наследие Season 1 — не архитектурные ссылки)

| Файл | Что | Заметка |
|---|---|---|
| `app/site-footer.tsx` | `TELEGRAM_URL = https://t.me/spirit_cards_game` | ✅ live (05.10) |
| `lib/site.ts` | `OPENSEA_URL` = `https://opensea.io/discover/chain/robinhood` | заменить на страницу коллекции, когда появится |
| `lib/site.ts` | `SITE_URL` = `https://spiritcards.fun` | ✅ 05.10 (домен подключён) |

## Заменено (заглушки уже стоят, старые S1-значения удалены)

- `app/site-footer.tsx`: X/GitHub → `"#"` (было `x.com/proof_of_arc`, `github.com/Proofofarchitect`).
- `lib/i18n/nav.ts`: подписи `ariaX` без `@proof_of_arc` (EN + ZH).
- `app/docs/agent-access/agent-access-content.tsx`: ключи MCP `proof-of-architect` → `proof-of-card`; ссылки X →
  реальный профиль (`X_URL` = `x.com/spirit_card`, текст `@spirit_card`); GitBook → `GITBOOK_EN_URL`; MCP — hosted
  `/api/mcp` + standalone `spirit-cards-mcp` (репо приватное, npm не опубликован).
- `public/.well-known/security.txt`: `Proof of Architect` → `Spirit Cards`, контакты/URL → актуальные (advisories + TG).
- `public/miner/miner-gpu-worker.js`, `public/miner/gpu-selftest.html`: `Proof of Architect` → `Spirit Cards`.
- Комментарии-заголовки CSS (`app/globals.css`, `app/poa/*.css`): `Proof of Architect` → `Spirit Cards`.

## Не трогали (внутреннее, не на сайте)

- `README.md` (репозитория webapp) — служебное описание, часть S1-форка.
- Имена файлов/символов `arc.ts`, `arcChain`, папка `app/poa/…` — технические
  идентификаторы темы; переименование не требуется (риск, польза нулевая).
