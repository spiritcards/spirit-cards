# Documentation index

Repository documentation for Spirit Cards. The **public**,
player-facing docs live in a separate repo: [`spirit-cards-docs`](https://github.com/spiritcards/spirit-cards-docs) (GitBook EN + 中文).

| Doc | Audience | What it covers |
|---|---|---|
| [`../contracts/`](../contracts) | Contract devs, auditors | Foundry project: Solidity core, tests, deploy scripts |
| [`../webapp/`](../webapp) | Web devs | The Next.js site: stack, routes, env, build & deploy |
| [`../miner/`](../miner) | Miners, tooling | CLI/browser PoW miner and hashrate measurement |
| [`agents/`](agents/README.md) | AI agents, integrators | Machine-readable surfaces: llms.txt, ai.json, OpenAPI, HTTP/JSON endpoints |
| [`mcp/`](mcp/README.md) | AI agents, tooling | Model Context Protocol (MCP) server — status, design, configuration |
| [`site/`](site/README.md) | Web devs | The Next.js site details: stack, routes, env |
| [`../gitbook/`](../gitbook) | Everyone | Public docs sources (EN + 中文) — rendering: `spirit-cards-docs` |
| [`../ALL_MECHANICS.md`](../ALL_MECHANICS.md) | Everyone | Full game-mechanics reference |

> Conventions: every claim is tagged `[proven]` (tested/on-chain) · `[assumed]` ·
> `[planned]` · `[open]`. Tags describe the state of the code, not promises.
