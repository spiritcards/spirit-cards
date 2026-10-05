"use client";

import { createWalletClient, custom, parseGwei, type Address } from "viem";
import { rhChain } from "./rh-chain";
import {
  getPublicClient,
  CORE_ADDRESS,
  CONFIG_ADDRESS,
  CHIP_ADDRESS,
  CHIP_ID,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
  CHIP_ABI,
} from "./poc";
import { RH_CHAIN_ID } from "./contract";
import type { Eip1193Provider } from "./ethereum";
import { PowMiner, WORKER_PATH, type MinerCandidate } from "./miner-client";
import { computeWork, leadingZeroBits } from "./pow";

/**
 * mining-engine.ts — a process-wide auto-mining engine.
 *
 * The engine lives at MODULE scope, not inside a React page, so the grind ↔
 * auto-mint loop keeps running while the user navigates the site (only a full
 * page reload stops it). The `/mine` page is a thin view over it, and the header
 * shows a small "mining" indicator anywhere in the app.
 *
 * React binds via `useMining()` / `useMiningRunning()` (useSyncExternalStore),
 * so progress ticks re-render only the subscribers — not the whole app.
 */

const FEE_FLOOR_GWEI = Math.max(1, Number(process.env.NEXT_PUBLIC_MIN_MAX_FEE_GWEI ?? "1") || 1);

const publicClient = getPublicClient();

const NONCE_USED_ABI = [
  {
    type: "function",
    name: "nonceUsed",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type Stats = {
  price: bigint;
  totalMinted: bigint;
  baseBits: number;
  mineCooldown: bigint;
  lastMintAt: bigint;
  chipBalance: bigint;
  chipDiscountBps: bigint;
  paused: boolean;
  maxSupply: bigint;
  paidMinted: bigint;
  eraSize: bigint;
  priceStepBps: bigint;
};

export type MiningState = {
  /** Auto-loop is active (grind → mint → cooldown → grind). */
  running: boolean;
  /** The worker is currently grinding a nonce. */
  grinding: boolean;
  /** A mint transaction is in flight. */
  busy: boolean;
  attempts: string;
  hashRate: number;
  bestBits: number | null;
  elapsedMs: number;
  foundNonce: bigint | null;
  status: string;
  error: string | null;
  txHash: string | null;
  useChip: boolean;
  /** Successful mints this session. */
  mints: number;
  workerAvailable: boolean | null;
  stats: Stats | null;
  /** Unix seconds when the per-wallet mine cooldown ends (0 = no active cooldown). */
  cooldownUntil: number;
};

const DEFAULT_STATE: MiningState = {
  running: false,
  grinding: false,
  busy: false,
  attempts: "0",
  hashRate: 0,
  bestBits: null,
  elapsedMs: 0,
  foundNonce: null,
  status: "",
  error: null,
  txHash: null,
  useChip: false,
  mints: 0,
  workerAvailable: null,
  stats: null,
  cooldownUntil: 0,
};

function randomStartNonce(): bigint {
  const words = new Uint32Array(2);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(words);
  } else {
    words[0] = Date.now() >>> 0;
    words[1] = (Math.random() * 0xffffffff) >>> 0;
  }
  return (BigInt(words[0]) << 32n) | BigInt(words[1]);
}

/** Known `mine()` revert codes — used to turn an on-chain revert into a retry. */
const MINE_REVERTS = ["COOLDOWN", "EPOCH_FULL", "PAUSED", "NONCE_USED", "BAD_POW", "SOLD_OUT", "NO_CHIP", "BAD_PAY"] as const;

/** Extract a known `mine()` revert code from a (viem) error, or null. */
function mineRevertReason(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : String(e);
  for (const code of MINE_REVERTS) if (msg.includes(code)) return code;
  return null;
}

class MiningEngine {
  private state: MiningState = DEFAULT_STATE;
  private listeners = new Set<() => void>();
  private miner: PowMiner | null = null;
  private startedAt = 0;
  private rejected = new Set<string>();
  private accepting = false;
  private bits: number | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  /** Highest known on-chain mint timestamp for the current wallet (chain or local). */
  private lastMintLocal = 0n;
  private address: Address | null = null;
  private provider: Eip1193Provider | null = null;

  // --- pub/sub -----------------------------------------------------------
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getState = (): MiningState => this.state;
  getServerState = (): MiningState => DEFAULT_STATE;

  private set(patch: Partial<MiningState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  // --- wallet wiring (pushed by the page) --------------------------------
  setWallet(address: Address | null, provider: Eip1193Provider | null): void {
    const changed = address !== this.address || provider !== this.provider;
    this.address = address;
    this.provider = provider;
    if (!changed) return;
    this.lastMintLocal = 0n; // cooldown is per-wallet — reset the local tracker
    if (!address && this.state.running) this.stop();
    void this.refreshStats();
  }

  setChip(useChip: boolean): void {
    this.set({ useChip });
  }

  // --- chain reads -------------------------------------------------------
  async refreshStats(): Promise<Stats | null> {
    const who = this.address;
    try {
      const [
        price,
        totalMinted,
        baseBits,
        mineCooldown,
        chipBalance,
        chipDiscountBps,
        paused,
        maxSupply,
        paidMinted,
        eraSize,
        priceStepBps,
      ] = await Promise.all([
        publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "currentPrice" }),
        publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "totalMinted" }),
        // difficulty is era-dependent now: read the contract's requiredBits(), not config.baseBits()
        publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "requiredBits" }),
        publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "mineCooldown" }),
        who
          ? publicClient.readContract({ address: CHIP_ADDRESS, abi: CHIP_ABI, functionName: "balanceOf", args: [who, CHIP_ID] })
          : Promise.resolve(0n),
        publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "chipDiscountBps" }),
        publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "paused" }),
        publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "maxSupply" }),
        publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "paidMinted" }),
        publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "eraSize" }),
        publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "priceStepBps" }),
      ]);

      let lastMintAt = 0n;
      if (who) {
        lastMintAt = await publicClient
          .readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "lastMintAt", args: [who] })
          .catch(() => 0n);
      }

      const next: Stats = {
        price,
        totalMinted,
        baseBits: Number(baseBits),
        mineCooldown,
        lastMintAt,
        chipBalance,
        chipDiscountBps,
        paused,
        maxSupply,
        paidMinted,
        eraSize,
        priceStepBps,
      };
      this.bits = next.baseBits;
      this.set({ stats: next });
      return next;
    } catch {
      return this.state.stats;
    }
  }

  // --- lifecycle ---------------------------------------------------------
  async start(): Promise<void> {
    if (!this.address) {
      this.set({ error: "Connect your wallet first." });
      return;
    }
    this.set({ running: true, error: null });
    if (this.state.workerAvailable === null) await this.checkWorker();
    // Always refresh so the cooldown guard sees a fresh on-chain `lastMintAt`.
    await this.refreshStats();
    if (this.cooldownWaitMs() > 0) {
      this.scheduleResume(this.state.stats);
      return;
    }
    this.spawn();
  }

  stop(): void {
    this.set({ running: false, status: "Stopped." });
    this.clearResume();
    this.clearCooldown();
    this.set({ cooldownUntil: 0 });
    this.teardown();
  }

  private async checkWorker(): Promise<void> {
    try {
      const res = await fetch(WORKER_PATH, { method: "HEAD", cache: "no-store" });
      this.set({ workerAvailable: res.ok });
    } catch {
      this.set({ workerAvailable: false });
    }
  }

  private startElapsed(): void {
    this.stopElapsed();
    this.elapsedTimer = setInterval(() => this.set({ elapsedMs: Date.now() - this.startedAt }), 500);
  }
  private stopElapsed(): void {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
  }
  private clearResume(): void {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  private clearCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  /**
   * Milliseconds until the per-wallet cooldown allows the next mint (0 = ready).
   * Uses the freshest of the on-chain `lastMintAt` and the locally recorded one,
   * so a missed/unsuccessful `refreshStats()` can never let us mine too early.
   */
  private cooldownWaitMs(): number {
    const chainLast = this.state.stats?.lastMintAt ?? 0n;
    const last = chainLast > this.lastMintLocal ? chainLast : this.lastMintLocal;
    const cd = this.state.stats?.mineCooldown ?? 0n;
    if (last === 0n || cd === 0n) return 0;
    const now = BigInt(Math.floor(Date.now() / 1000));
    const readyAt = last + cd;
    return readyAt > now ? Number(readyAt - now) * 1000 : 0;
  }

  /** Show a live "cooling down" countdown while the cooldown is active. */
  private beginCooldown(waitMs: number): void {
    this.clearCooldown();
    const untilSec = Math.floor((Date.now() + waitMs) / 1000);
    this.set({ cooldownUntil: untilSec });
    const tick = (): void => {
      const left = untilSec - Math.floor(Date.now() / 1000);
      if (left <= 0 || !this.state.running) {
        this.clearCooldown();
        this.set({ cooldownUntil: 0 });
        return;
      }
      this.set({ status: `Cooling down · ready in ~${left}s` });
    };
    tick();
    this.cooldownTimer = setInterval(tick, 1000);
  }

  private teardown(): void {
    this.miner?.terminate();
    this.miner = null;
    this.stopElapsed();
    this.set({ grinding: false });
  }

  private spawn(): void {
    if (!this.state.running) return;
    // Never start a grind while the per-wallet cooldown is still active.
    if (this.cooldownWaitMs() > 0) {
      this.scheduleResume(this.state.stats);
      return;
    }
    this.clearCooldown();
    this.set({ cooldownUntil: 0, error: null, foundNonce: null, attempts: "0", hashRate: 0 });
    const bits = this.state.stats?.baseBits ?? this.bits;
    if (bits == null) {
      this.set({ error: "Could not read on-chain difficulty yet." });
      return;
    }
    if (this.state.workerAvailable === false) {
      this.set({ error: `Miner worker not found at ${WORKER_PATH}.` });
      return;
    }
    let miner: PowMiner;
    try {
      miner = new PowMiner(WORKER_PATH);
    } catch {
      this.set({ workerAvailable: false, error: "Could not spawn the miner worker (blocked or CSP)." });
      return;
    }
    this.miner = miner;
    miner.onStarted = () => {
      this.startedAt = Date.now();
      this.set({ grinding: true, status: "Grinding nonce…" });
      this.startElapsed();
    };
    miner.onProgress = (msg) => {
      this.set({ attempts: msg.attempts, hashRate: msg.hashesPerSecond, bestBits: msg.bestBits });
      this.consume(msg.best);
    };
    miner.onDone = (msg) => {
      this.set({ grinding: false, attempts: msg.attempts, elapsedMs: Date.now() - this.startedAt });
      this.stopElapsed();
      if (msg.best?.length) this.consume(msg.best);
    };
    miner.onError = (msg) => {
      this.miner = null;
      this.stopElapsed();
      this.set({ grinding: false, error: msg.message || "Miner worker failed." });
    };
    miner.start({
      chainId: RH_CHAIN_ID,
      contract: CORE_ADDRESS,
      miner: this.address as Address,
      keep: 16,
      batchSize: 4096,
      requiredBits: bits,
      startNonce: randomStartNonce(),
    });
  }

  private consume(best: MinerCandidate[]): void {
    const needed = this.state.stats?.baseBits ?? this.bits;
    if (this.accepting || needed === null || needed <= 0 || !this.address) return;
    const winner = best.find((c) => c.bits >= needed && !this.rejected.has(c.nonce));
    if (!winner) return;
    let nonce: bigint;
    try {
      nonce = BigInt(winner.nonce);
    } catch {
      return;
    }
    if (leadingZeroBits(computeWork(this.address, nonce)) < needed) return;

    this.accepting = true;
    void (async () => {
      try {
        const used = await publicClient.readContract({
          address: CORE_ADDRESS,
          abi: NONCE_USED_ABI,
          functionName: "nonceUsed",
          args: [this.address as Address, nonce],
        });
        if (used) {
          this.rejected.add(winner.nonce);
          return;
        }
        this.set({ foundNonce: nonce, bestBits: Math.max(this.state.bestBits ?? 0, winner.bits) });
        this.teardown();
        if (this.state.running && !this.state.busy) void this.mint(nonce);
      } finally {
        this.accepting = false;
      }
    })();
  }

  private scheduleResume(_next: Stats | null): void {
    if (!this.state.running) return;
    this.clearResume();
    const remaining = this.cooldownWaitMs();
    const waitMs = remaining > 0 ? remaining + 1500 : 4000;
    if (remaining > 0) {
      this.beginCooldown(waitMs);
    } else {
      this.clearCooldown();
      this.set({ cooldownUntil: 0, status: `Auto-mining · next round in ~${Math.round(waitMs / 1000)}s` });
    }
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      if (this.state.running) this.spawn();
    }, waitMs);
  }

  private async mint(nonce: bigint): Promise<void> {
    this.set({ foundNonce: null, error: null, txHash: null, busy: true, status: `Submitting mine(${nonce})…` });
    const provider = this.provider;
    const address = this.address;
    if (!provider || !address) {
      this.set({ error: "Connect your wallet first.", busy: false });
      this.stop();
      return;
    }
    try {
      const price = await publicClient.readContract({
        address: CORE_ADDRESS,
        abi: PROOF_OF_CARD_ABI,
        functionName: "currentPrice",
      });
      let chipBal = 0n;
      try {
        chipBal = await publicClient.readContract({
          address: CHIP_ADDRESS,
          abi: CHIP_ABI,
          functionName: "balanceOf",
          args: [address, CHIP_ID],
        });
      } catch {
        /* treat as no chips */
      }
      const useChip = this.state.useChip && chipBal > 0n;
      const disc = this.state.stats?.chipDiscountBps ?? 0n;
      const due = useChip ? (price * (10000n - disc)) / 10000n : price;

      let maxFeePerGas = parseGwei(String(FEE_FLOOR_GWEI));
      try {
        const block = await publicClient.getBlock({ blockTag: "latest" });
        const twice = (block.baseFeePerGas ?? 0n) * 2n;
        if (twice > maxFeePerGas) maxFeePerGas = twice;
      } catch {
        /* keep floor */
      }

      // Pre-flight: catch COOLDOWN / EPOCH_FULL / etc. with eth_call instead of
      // broadcasting a tx that would revert on-chain (wasted gas + scary error).
      try {
        await publicClient.simulateContract({
          account: address,
          address: CORE_ADDRESS,
          abi: PROOF_OF_CARD_ABI,
          functionName: "mine",
          args: [nonce, useChip],
          value: due,
        });
      } catch (simErr) {
        const reason = mineRevertReason(simErr);
        if (reason === "COOLDOWN") {
          await this.refreshStats();
          this.set({ foundNonce: null });
          this.scheduleResume(this.state.stats);
          return;
        }
        if (reason === "EPOCH_FULL") {
          await this.refreshStats();
          this.set({ foundNonce: null, status: "Hourly emission cap reached — waiting…" });
          this.scheduleResume(this.state.stats);
          return;
        }
        if (reason === "NONCE_USED") {
          this.rejected.add(String(nonce));
          this.scheduleResume(this.state.stats);
          return;
        }
        if (reason === "PAUSED" || reason === "SOLD_OUT") {
          this.set({ error: reason === "PAUSED" ? "Mining is paused." : "Sold out." });
          this.stop();
          return;
        }
        // Unknown / RPC quirk (e.g. eth_call unsupported) → best-effort send below.
      }

      const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
      const hash = await walletClient.writeContract({
        account: address,
        address: CORE_ADDRESS,
        abi: PROOF_OF_CARD_ABI,
        functionName: "mine",
        args: [nonce, useChip],
        value: due,
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas / 2n,
      });
      this.set({ txHash: hash, status: `mine submitted (nonce ${nonce}). Waiting for receipt…` });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status === "success") {
        try {
          const blk = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
          this.lastMintLocal = blk.timestamp; // exact on-chain mint time — keeps the guard honest
        } catch {
          this.lastMintLocal = BigInt(Math.floor(Date.now() / 1000));
        }
        this.set({
          status: `Minted (nonce ${nonce}) in block ${receipt.blockNumber}.`,
          mints: this.state.mints + 1,
        });
        const next = await this.refreshStats();
        this.scheduleResume(next);
      } else {
        // Should be rare (pre-flight sim catches most). Do NOT surface a scary
        // error — just refresh and retry once the cooldown is respected.
        await this.refreshStats();
        this.set({ status: "Mine rejected on-chain — retrying after cooldown." });
        this.scheduleResume(this.state.stats);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Mint failed";
      this.set({
        error: /user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message,
      });
      this.scheduleResume(null);
    } finally {
      this.set({ busy: false });
    }
  }
}

export const mining = new MiningEngine();
