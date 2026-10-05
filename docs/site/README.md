# Site (webapp)

The Spirit Cards web app — `webapp/`. Next.js 15 (App Router) + React 19 +
Tailwind v4, deployed on Vercel. Read-only on-chain reads over RPC; wallet flows
for mine / merge / stake / battle.

## Stack `[proven]`

- **Framework:** Next.js 15 (`app/` router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), design tokens "Ore & Elements"
- **Chain access:** `viem` (multicall batching), `@walletconnect/ethereum-provider`
- **Art:** deterministic PNG render from on-chain `seedOf` (`sharp`), layered assets in `public/poc-art`
- **Analytics:** `@vercel/analytics`, `@vercel/speed-insights`

## Routes `[proven]`

| Route | Purpose |
|---|---|
| `/` | Landing (hero, loop, collection preview) |
| `/mine` | Mining console + background auto-miner + packs + live feed |
| `/collection` | All species designs + element filters |
| `/stake` | Staking (6 tiers) + dividends |
| `/battle` | PvP duels (open duels, feed) |
| `/merge` | Merge / evolution |
| `/points` | Activity leaderboard |
| `/pool`, `/profile`, `/token/[id]`, `/stats`, `/claim` | Pool, profile, card page, stats, claims |
| `/docs/*` | Docs (index, game guide, verification, stats, agent-access) |
| `/zh/*` | Simplified-Chinese mirror of selected routes |

API routes: `/api/{image,meta,preview,sample,points,pool,recent}` — see [`../agents/README.md`](../agents/README.md).

## Environment

Copy `webapp/.env.local.example` → `webapp/.env.local`. Key variables:

| Var | Meaning |
|---|---|
| `NEXT_PUBLIC_RH_CHAIN_ID` | Chain id (default current deployment; mainnet `4663`) |
| `NEXT_PUBLIC_RH_RPC_URL` / `_EXPLORER_URL` | RPC / explorer endpoints |
| `NEXT_PUBLIC_RH_IS_TESTNET` | `"true"` / `"false"` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (sitemap/llms/JSON-LD/OpenAPI) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Core contract override |
| `NEXT_PUBLIC_GITHUB_URL`, `_X_URL`, `_TELEGRAM_URL` | Social links |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional — enables mobile QR pairing |

> Never commit `.env.local`. Only `*.example` templates are tracked.

## Build & deploy

```bash
cd webapp
npm ci
npm run build      # production build
npx tsc --noEmit   # typecheck
npm run check:addresses   # canonical-address gate
```

Deploy target: **Vercel**. On redeploy of the contract stack, update the address
env var and re-run `npm run check:addresses`.

## Related

- Web app details: [`../../webapp/README.md`](../../webapp/README.md)
- Live site: https://spiritcards.fun
- Public docs (GitBook): [`spirit-cards-docs`](https://github.com/spiritcards/spirit-cards-docs)
