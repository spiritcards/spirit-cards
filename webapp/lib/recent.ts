import { createPublicClient, http, parseAbiItem } from "viem";
import { rhChain, RH_RPC_URL } from "./rh-chain";
import { rpcFetch } from "./rpc";
import { CORE_ADDRESS, PACKS_ADDRESS } from "./poc";
import { CANON_FROM_BLOCK } from "./canonical";

/**
 * Live activity feed — the most recent `Mined` (SpiritCards core) and
 * `PackOpened` (Packs) events, read straight from the Robinhood Chain RPC via
 * `eth_getLogs`.
 *
 * A pack is shown as ONE tile ("PACK ×N" — N cards) rather than by expanding its
 * dropped cards, so a single 100-pack can never flood the strip.
 *
 * The RPC silently returns an empty result for `eth_getLogs` ranges wider than
 * a few thousand blocks, so we scan BACKWARD in small chunks (and stop early
 * once we have enough events). This makes the feed correct both on a busy
 * mainnet (found in the first chunk) and on a quiet testnet (older mints are
 * still picked up).
 *
 * Server-side only; cached in-memory so the client can poll freely. On any
 * failure the last cache (or an empty list) is returned — the feed must never
 * break the page.
 */

/** Max block span the RPC serves per `eth_getLogs` call. */
const CHUNK = 9_000n;
/** Hard lookback cap; the effective floor is CANON_FROM_BLOCK (never scan before deploy). */
const MAX_LOOKBACK = 500_000n;
/** Wall-clock budget for one scan pass; stops early and returns what it has. */
const BUDGET_MS = 7_000;
/** Parallel getLogs rounds (each round asks for both event types). */
const CONCURRENCY = 8;
const CACHE_MS = 15_000;

export type RecentEvent = {
  kind: "claim" | "mint" | "pack";
  tokenId: number;
  miner: string;
  bits?: number;
  /** Native ETH/wei paid (mint price, or pack price for `pack`). */
  paid?: string;
  /** Pack size in cards (only for `kind: "pack"`). */
  size?: number;
  /** Pre-formatted pack-size label, e.g. "×25" (only for `kind: "pack"`). */
  label?: string;
  txHash: string;
  timestamp: string;
};

const MINED = parseAbiItem(
  "event Mined(address indexed miner, uint256 indexed tokenId, uint256 nonce, bytes32 work, uint256 bits, uint256 paid)",
);
const PACK_OPENED = parseAbiItem(
  "event PackOpened(address indexed buyer, uint256 size, uint256 firstId, uint256 paid, uint256 discountBps)",
);

const client = createPublicClient({
  chain: rhChain,
  transport: http(RH_RPC_URL, { timeout: 8_000, fetchFn: rpcFetch(2) }),
});

let cache: { at: number; data: RecentEvent[] } | null = null;

type FeedItem = RecentEvent & { blockNumber: bigint; logIndex: number };

export async function getRecentActivity(limit = 10): Promise<RecentEvent[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data.slice(0, limit);
  }

  const started = Date.now();
  try {
    const latest = await client.getBlockNumber();
    const lookback = latest > MAX_LOOKBACK ? latest - MAX_LOOKBACK : 0n;
    // Never scan blocks before the stack deploy — nothing can exist there.
    const floor = lookback > BigInt(CANON_FROM_BLOCK) ? lookback : BigInt(CANON_FROM_BLOCK);

    const items: FeedItem[] = [];
    let hi = latest;
    while (hi > floor && items.length < limit) {
      if (Date.now() - started > BUDGET_MS) break; // wall-clock guard
      // Build a batch of adjacent [lo, hi] windows, newest-first.
      const batch: [bigint, bigint][] = [];
      for (let i = 0; i < CONCURRENCY && hi > floor; i++) {
        const lo = hi >= floor + CHUNK - 1n ? hi - CHUNK + 1n : floor;
        batch.push([lo, hi]);
        hi = lo - 1n;
      }

      // Per window, fetch both streams (each best-effort).
      const windowLogs = await Promise.all(
        batch.map(async ([lo, to]) => {
          const [mined, packOpened] = await Promise.all([
            client.getLogs({ address: CORE_ADDRESS, event: MINED, fromBlock: lo, toBlock: to }).catch(() => []),
            client.getLogs({ address: PACKS_ADDRESS, event: PACK_OPENED, fromBlock: lo, toBlock: to }).catch(() => []),
          ]);
          return { mined, packOpened };
        }),
      );

      for (const { mined, packOpened } of windowLogs) {
        for (const log of mined) {
          items.push({
            kind: "mint",
            tokenId: Number(log.args.tokenId ?? 0n),
            miner: String(log.args.miner ?? ""),
            bits: log.args.bits !== undefined ? Number(log.args.bits) : undefined,
            paid: log.args.paid !== undefined ? String(log.args.paid) : undefined,
            txHash: log.transactionHash ?? "",
            timestamp: "",
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
          });
        }

        // One tile per pack purchase ("PACK ×N").
        for (const log of packOpened) {
          const size = Number(log.args.size ?? 0n);
          items.push({
            kind: "pack",
            tokenId: Number(log.args.firstId ?? 0n),
            miner: String(log.args.buyer ?? ""),
            size,
            label: size > 0 ? `×${size}` : undefined,
            paid: log.args.paid !== undefined ? String(log.args.paid) : undefined,
            txHash: log.transactionHash ?? "",
            timestamp: "",
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
          });
        }
      }
    }

    // Newest-first, de-duplicated by tx + kind + token.
    items.sort((a, b) =>
      a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : a.blockNumber < b.blockNumber ? 1 : -1,
    );
    const seen = new Set<string>();
    const uniqueItems = items.filter((it) => {
      const key = `${it.txHash}-${it.kind}-${it.tokenId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Resolve block timestamps (best-effort).
    const uniqueBlocks = [...new Set(uniqueItems.map((i) => Number(i.blockNumber)))];
    const timestamps = new Map<number, string>();
    await Promise.all(
      uniqueBlocks.map(async (bn) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(bn) });
          timestamps.set(bn, new Date(Number(block.timestamp) * 1000).toISOString());
        } catch {
          /* leave timestamp blank */
        }
      }),
    );

    const events: RecentEvent[] = uniqueItems.map((item) => ({
      kind: item.kind,
      tokenId: item.tokenId,
      miner: item.miner,
      bits: item.bits,
      paid: item.paid,
      size: item.size,
      label: item.label,
      txHash: item.txHash,
      timestamp: timestamps.get(Number(item.blockNumber)) ?? "",
    }));

    cache = { at: Date.now(), data: events };
    return events.slice(0, limit);
  } catch {
    // Remember the empty result briefly so a flaky RPC does not make every
    // poll re-run the whole scan.
    if (!cache) cache = { at: Date.now(), data: [] };
    return cache.data.slice(0, limit);
  }
}
