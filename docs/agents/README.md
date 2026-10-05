# Agent access

How AI agents and developers integrate with Spirit Cards. Everything here is
**read-only and anonymous** — no API keys, no accounts, no wallet.

> Live site: the deployed web app (see repo description). The machine-readable
> artifacts below are served from the site root.

## Machine-readable discovery

| Artifact | URL | Purpose |
|---|---|---|
| Service manifest | `/.well-known/ai.json` | Name, chain, contracts, endpoints, mechanics summary |
| LLM index | `/llms.txt` | Short, structured overview for LLMs |
| LLM full | `/llms-full.txt` | Expanded corpus for LLMs |
| OpenAPI | `/openapi.yaml` | OpenAPI 3.0 spec of the HTTP API |
| Robots / Sitemap | `/robots.txt`, `/sitemap.xml` | Crawler policy and map |

## HTTP/JSON endpoints `[proven]`

| Endpoint | Returns |
|---|---|
| `GET /api/meta/{id}` | ERC-721 metadata for token `id` (name, image, attributes, rarity) |
| `GET /api/image/{id}` | Deterministic PNG render of the card (derived from on-chain `seedOf`) |
| `GET /api/preview/{species}` | Preview of a species design |
| `GET /api/sample/{n}` | Sample cards |
| `GET /api/points` | Activity-points leaderboard data |
| `GET /api/pool` | Staking-pool status |
| `GET /api/recent` | Recent `Mined` / `PackOpened` activity |
| `POST /api/mcp` | **MCP server** — read-only tools over Streamable HTTP (see [`../mcp/README.md`](../mcp/README.md)) |
| `GET /stats/current.json` | Machine-readable stats snapshot |
| `GET /stats/history.jsonl` | Stats time series (JSON Lines) |

All data is read live from the deployed contracts over RPC and served as static,
server-rendered resources that work **without JavaScript or a wallet**.

## Integration notes

- No authentication for reads. There is **no write surface** for agents today
  (`[open]`) — any future registration is signature-based, never key-based.
- Values are deterministic: a card's stats and art derive from its on-chain seed,
  so an agent can recompute them off-chain and cross-check.
- The API is `chainId`-parameterized; treat the site's configured chain as canonical.

## Canonical sources

- Machine-readable: `/openapi.yaml`, `/.well-known/ai.json`, `/llms.txt`, `/llms-full.txt`.
- Human docs: [`spirit-cards-docs`](https://github.com/spiritcards/spirit-cards-docs).
- Contract addresses: canonical set lives in `webapp/lib/canonical.ts` (frontend single source of truth); public reference — the GitBook "Contracts & Addresses" page.

> Status: HTTP/JSON surfaces **and** the MCP server are **implemented** `[proven]` —
> see [`../mcp/README.md`](../mcp/README.md).
