# MCP (Model Context Protocol)

Status: **implemented** `[proven]`. Spirit Cards ships a read-only MCP server in two forms:

| Form | Where | Transport | Use |
|---|---|---|---|
| **Hosted** | `<site>/api/mcp` | Streamable HTTP (stateless) | Zero-install; Claude Desktop, Cursor, any MCP client |
| **Standalone** | [`spirit-cards-mcp`](https://github.com/spiritcards/spirit-cards-mcp) (`npx spirit-cards-mcp`) | stdio | Local process clients |

Both are **read-only and anonymous** — no API keys, no accounts, no wallet, no writes.

> Hosted source: [`webapp/app/api/mcp/route.ts`](../../webapp/app/api/mcp/route.ts) — built on
> [`mcp-handler`](https://github.com/vercel/mcp-handler) v2 (serves the 2026-07-28 spec and
> 2025-era Streamable HTTP clients from one handler).

## Tools

| Tool | Input | Returns |
|---|---|---|
| `get_project_info` | — | What the game is: loop, chain, links, collection/economy basics |
| `get_collection_stats` | — | Supply, mint price, difficulty (`requiredBits`), cooldown, counters, paused |
| `get_card` | `tokenId` | Species, element, rarity, HP/ATK/DEF, on-chain seed |
| `verify_nonce` | `miner`, `nonce` | Recomputed `work` hash, leading-zero bits, `requiredBits`, `valid` |
| `find_nonce` | `miner`, `maxAttempts?` | Grinds a valid PoW nonce so a wallet can mint immediately |
| `get_mining_guide` | — | Step-by-step guide to start mining, with live difficulty/price/cooldown and the exact mint call |
| `get_leaderboard` | `limit?` | Activity-points leaderboard (top N wallets) |
| `get_pool` | — | Accrued pool, split shares, vault total weight, undistributed |
| `get_recent_activity` | `limit?` | Recent on-chain activity (mints / pack opens) |

## Prompts

| Prompt | Args | Purpose |
|---|---|---|
| `project_overview` | — | Introduce Spirit Cards to a newcomer |
| `start_mining` | `wallet?` | Walk a user through minting: guide + a ready-to-use nonce |

## Client configuration

**Hosted (Streamable HTTP):**

```json
{
  "mcpServers": {
    "spirit-cards": { "url": "https://<site>/api/mcp" }
  }
}
```

**Standalone (stdio):**

```json
{
  "mcpServers": {
    "spirit-cards": { "command": "npx", "args": ["-y", "spirit-cards-mcp"] }
  }
}
```

**stdio-only client against the hosted endpoint** (via [`mcp-remote`](https://www.npmjs.com/package/mcp-remote)):

```json
{
  "mcpServers": {
    "spirit-cards": { "command": "npx", "args": ["-y", "mcp-remote", "https://<site>/api/mcp"] }
  }
}
```

## Ground rules

- Read-only by design. No wallet, no signing, no secrets.
- No API keys or accounts; anonymous by default.
- Stateless HTTP transport — no sessions, no server-side state.

## Notes on `find_nonce`

`find_nonce` grinds locally in-process, so its success within the time cap depends on host
CPU throughput and the live difficulty (`requiredBits`). At ~20 bits it usually finds a nonce,
but a slow/loaded host can return `found: false` — callers should retry or raise `maxAttempts`.
`[assumed]` measured on this workstation.

## Related

- HTTP/JSON surfaces for non-MCP agents: [`../agents/README.md`](../agents/README.md)
- Standalone package repo: [`spirit-cards-mcp`](https://github.com/spiritcards/spirit-cards-mcp)
