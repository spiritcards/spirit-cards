# Contributing

Thanks for your interest in Spirit Cards. This repo is currently
**private**; contributions happen via pull requests against `main`.

## Ground rules

- **Never commit secrets.** No private keys, seed phrases, tokens, `.env`, or
  `wallets/` content — see [AGENTS.md](AGENTS.md) and [SECURITY.md](SECURITY.md).
  Secrets live in KeePass only. `set -x` is forbidden.
- Keep the core **tunable** (Config + Safe), not hard-coded.
- Every claim in docs/PRs is tagged `[proven]` / `[assumed]` / `[planned]` / `[open]`.

## Local setup

```bash
# contracts (Foundry)
cd contracts
forge install foundry-rs/forge-std   # lib/ is gitignored
forge test

# webapp (Next.js)
cd webapp
npm ci
npm run build
npx tsc --noEmit
```

## Workflow

1. Branch off `main` (`feat/…`, `fix/…`, `docs/…`, `chore/…`).
2. Make focused commits with clear messages (imperative subject).
3. Ensure `forge test` (green) and `npm run build` + `tsc` (green) before opening a PR.
4. Open a PR using the template; fill in what changed, why, and how it was verified.
5. Do not commit build artifacts, `node_modules/`, `.next/`, keys, or wallets.

## Commit style

```
<type>(<scope>): <short summary>

<body: what & why, [proven]/[assumed] tags, references>
```

`type` ∈ feat, fix, docs, chore, refactor, test, perf.

## Licensing

By contributing you agree your contributions are licensed under the [MIT License](LICENSE).
