# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via **GitHub Security Advisories**:
`Security` tab → *Report a vulnerability* (repo → Security → Advisories → New draft advisory).

If you cannot use advisories, contact the maintainers out-of-band:
- Telegram: `t.me/spirit_cards_game`

Please include: affected component (contract / web / miner / docs), a description,
reproduction steps, and impact. We aim to acknowledge within a few days.

## Scope

- `contracts/` — Solidity core (Config, SpiritCards, ChipToken, StakeVault, Battle,
  Points, Packs, ReentrancyGuard). Invariants are documented in `ALL_MECHANICS.md`.
- `webapp/` — Next.js site (read-only RPC + wallet flows; no server-side custody).
- `miner/` — CLI/browser miner (non-custodial; only public addresses are used).

## Secret handling (contributors)

- Private keys, seed phrases and tokens are stored **only in KeePass** and are
  **never** committed. `wallets/`, `.env*`, `*.kdbx`, `*.pem`, `*.key` are gitignored.
- The contract core is **tunable** (Config under a Safe) and auditable on-chain.
- No secret, key, or personal data may appear in code, docs, commit messages or logs.

## Supported versions

The `main` branch is the supported line. Only the latest deployed stack is in scope.
