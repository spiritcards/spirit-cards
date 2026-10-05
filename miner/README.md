# Spirit Cards — Miner & Measurement Tooling

Standalone, dependency-light PoW miner and hashrate measurement for the
**Spirit Cards (SPC)** minting puzzle. Pure-JS keccak (no native builds), so it
runs on a laptop, a CI runner, or in a phone browser.

> Scope: this directory only. It does **not** import or modify `web/` or
> `contracts/`. It talks to the live contracts over RPC.

---

## The puzzle (matches the contract **exactly**)

```
work = keccak256( abi.encodePacked(
           block.chainid,   // uint256 -> 32 bytes, big-endian
           address(SpiritCards),    // 20 bytes
           miner,           // 20 bytes
           nonce            // uint256 -> 32 bytes, big-endian
       ) )                  // => 104 bytes total, no padding between fields
valid  iff  leadingZeroBits(work) >= config.baseBits()
```

`SpiritCards.mine(uint256 nonce, bool useChip) payable`, with `msg.value` equal to
`currentPrice()` (times `1 - chipDiscountBps/10000` when `useChip` is true).

**Encoding proof** — the work value in the on-chain `Mined` event was reproduced
byte-for-byte by this tool ([proven]):

| field | value |
|---|---|
| tx | `0x33fb3b159691f40bec5ea090cad8a9f002eb30ae5954049e914d715a0fc52d71` |
| miner | `0x280d1C2B20728F43d440A7449113283aD224207A` |
| nonce | `639264` |
| work (on-chain) | `0x00000852e463cfc18327b39b3a196abcbfe24424ce2830db3a9c658da0833546` |
| work (this tool) | `0x00000852e463cfc18327b39b3a196abcbfe24424ce2830db3a9c658da0833546` ✔ |

---

## Files

| file | what |
|---|---|
| `package.json` | type: module; deps `js-sha3` (pure-JS keccak) + `viem` (RPC / signing) |
| `pow.mjs` | shared PoW core (prefix build, keccak, leading-zero-bits, hot search loop) |
| `mine.mjs` | CLI: find a nonce; optionally sign & broadcast `mine(...)` |
| `measure.mjs` | pure CPU benchmark → hashrate + baseBits→time estimate table |
| `measure.html` | standalone phone page (WebWorker + CDN keccak) → live hashrate |

---

## Quick start

```bash
cd miner
npm install

node mine.mjs --help          # usage
node measure.mjs              # benchmark this machine (~3 s)
node mine.mjs                 # dry-run, throwaway address (measures your speed)
node mine.mjs --base-bits 20  # dry-run at explicit difficulty
```

### Real mint (needs a funded key)

```bash
export MINER_KEY=0x...        # never paste this into logs/history/shared shells
node mine.mjs --mine          # baseBits auto-read from Config
node mine.mjs --mine --count 3
node mine.mjs --mine --use-chip   # spends 1 chip, value = price - 30%
```

`--mine` prints the tx hash and an explorer link
(`https://robinhoodchain.blockscout.com/tx/<hash>`).

### Defaults

| param | default |
|---|---|
| `--rpc` | `https://rpc.mainnet.chain.robinhood.com` (chainId `4663`) |
| `--contract` | `0x0997DB0BEa2c1278063ebBEc0d1cdbecE7B6F021` (SpiritCards, стек t9) |
| `--config` | `0x678629B80ab8A3Bc049e0FaBca7Aa5De826c8819` (Config, стек t9) |
| `--explorer` | `https://robinhoodchain.blockscout.com` |

Env overrides: `RPC_URL`, `POC_ADDRESS`, `CONFIG_ADDRESS`, `EXPLORER`, `MINER_KEY`,
`GAS_LIMIT` (default `600000` — the RPC's `eth_estimateGas` is flaky, so the gas
limit is pinned).

---

## Measured on this machine (desktop CPU)

`node measure.mjs` on **AMD Ryzen 7 5800H (16 threads), Node v22, single-thread,
pure-JS keccak**:

```
hashrate : 211.3 kH/s  (211,319 H/s)   — 1,056,768 hashes in 5.00 s
```

| baseBits | expected attempts | expected avg time (this CPU) |
|---|---|---|
| 16 | 65,536 | **0.31 s** |
| 18 | 262,144 | **1.2 s** |
| 20 | 1,048,576 | **5.0 s**  ← currently deployed difficulty |
| 22 | 4,194,304 | **19.8 s** |
| 24 | 16,777,216 | **1.3 min** |

> **Measured on a desktop CPU; phones are ~5–20× slower.**
> (A prior independent run recorded ~135 kH/s → baseBits 20
> in ~4.7 s; same order of magnitude. [proven])

Expected time is `2^baseBits / hashrate` (success probability per hash = `2^-baseBits`).

---

## Phones — read your hashrate

`measure.html` is a single self-contained page: it runs the same PoW in a
WebWorker (keccak loaded from a CDN) and shows big numbers for screenshotting —
current **H/s** and the estimated time for **baseBits 16 / 18 / 20 / 22**.

```bash
# serve over http (a Blob WebWorker is blocked under file:// in many browsers)
python3 -m http.server 8080      # or: npx --yes serve .
```

Open `http://<your-LAN-ip>:8080/measure.html` on the phone (needs internet on
first load to fetch keccak from the CDN). Read the **first stable hashrate**
value — heat and battery throttling will lower it over time.

---

## Setting up a miner key

1. Create a **dedicated** wallet (do not reuse deployer/treasury keys). On this
   machine keys live in **KeePass** (`Crypto/pow_cards/...`), never in files.
2. Fund it with a little ETH (gas + mint price). Faucets are
   listed in `ops/RH_TESTNET.md` (QuickNode faucet needs no login).
3. Run with the key only via env, ideally in a throwaway shell:

   ```bash
   MINER_KEY=0x... node mine.mjs --mine
   ```

### Safety — never commit keys

- The repo `.gitignore` already ignores `.env`, `*.key`, `*.pem`, `wallets/`, `secrets/`.
- Keep the key in a local, untracked env file (e.g. `miner/.env.local`) or KeePass,
  never in `package.json`, README, shell history, or a shared terminal.
- Do **not** run `git add`/`git commit` from here — this tooling is intentionally
  left uncommitted.

---

## Farms (many wallets, many CPUs)

The on-chain `mineCooldown` (currently **45 s per wallet**) — not hashrate — caps
throughput per key. To mint continuously you need many funded wallets.

- **GitHub Actions / CI runners (cheap CPU farm):** a workflow can `npm ci` then
  run `node mine.mjs --mine` on a schedule, with `MINER_KEY` stored as an
  encrypted **Actions secret** (one secret per wallet; a matrix = many
  runners). Each runner is ephemeral, so a dedicated low-value key per job is
  safest. Check the runner terms before relying on it.
- **Multiple keys locally:** loop wallets and submit one mint each per cooldown
  window; combine with `--count` per wallet.
- **GPU:** the current implementation is **CPU pure-JS** only. A real GPU path
  needs a native keccak backend (e.g. cuKeccak / OpenCL keccak) — **planned, not
  included**. Expect ~10–100× a single CPU core once built.

---

## Limitations / TODOs

- [ ] `--mine` is one-shot per wallet: it respects `mineCooldown` between
      consecutive mints but does not manage a pool of keys.
- [ ] Price read for `msg.value` happens just before send; a competing mint in
      the same block changes `currentPrice()` → `BAD_PAY` revert (rare). Retry.
- [ ] No verification that the RPC `chainId` matches the contract deployment
      beyond a warning; pass `--rpc` explicitly for other networks.
- [ ] GPU/WebGPU keccak backend not implemented (CPU/JS only).
- [ ] `measure.html` fetches keccak from a CDN — needs internet on first load.
- [x] Mainnet (`chainId 4663`) constants wired in (t9, 2026-10-05); env overrides remain.

## Verification status

- [proven] PoW encoding matches the on-chain `Mined` event byte-for-byte.
- [proven] `npm install` clean; `node measure.mjs` and `node mine.mjs` run.
- [proven] `measure.html` worker loop executed in a mocked Worker env (~131 kH/s).
- [proven] `--key` path derives the address and self-verifies the found nonce.
- [assumed] Phone hashrate (not measured on a real phone yet — that is the point
  of `measure.html`).
- [not done] No transaction was broadcast from this environment.
