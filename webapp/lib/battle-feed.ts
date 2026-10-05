import { createPublicClient, http, parseAbiItem } from "viem";
import { rhChain, RH_RPC_URL } from "./rh-chain";
import { rpcFetch } from "./rpc";
import { BATTLE_ADDRESS } from "./poc";

/**
 * Live battle feed — the most recent `DuelCreated` / `DuelResolved` /
 * `DuelCancelled` events of the Battle contract, read from the Robinhood Chain
 * RPC via `eth_getLogs` (backward chunked scan, same approach as `recent.ts`).
 *
 * Server-side only; cached in-memory so the client can poll freely; never throws
 * to the caller (returns the last cache or an empty list on failure).
 */

const CHUNK = 9_000n;
const MAX_LOOKBACK = 500_000n;
const CONCURRENCY = 8;
const CACHE_MS = 15_000;

export type BattleEvent = {
  kind: "created" | "resolved" | "cancelled";
  duelId: number;
  /** Card to show as the tile thumbnail (winner card for resolved, opener card otherwise). */
  tokenId: number;
  /** Resolved only: the beaten card. */
  loseCard?: number;
  /** Actor: opener (created/cancelled) or winner (resolved). */
  account: string;
  /** Resolved only: winner payout in wei. */
  payout?: string;
  /** Created only: stake in wei. */
  stake?: string;
  txHash: string;
  timestamp: string;
};

const DUEL_CREATED = parseAbiItem(
  "event DuelCreated(uint256 indexed id, address indexed a, uint256 cardA, uint256 stake)",
);
const DUEL_RESOLVED = parseAbiItem(
  "event DuelResolved(uint256 indexed id, address indexed winner, uint256 winCard, uint256 loseCard, uint256 payout, uint256 rake)",
);
const DUEL_CANCELLED = parseAbiItem(
  "event DuelCancelled(uint256 indexed id, address indexed a, uint256 cardA, uint256 stake)",
);

const client = createPublicClient({
  chain: rhChain,
  transport: http(RH_RPC_URL, { timeout: 8_000, fetchFn: rpcFetch(2) }),
});

let cache: { at: number; data: BattleEvent[] } | null = null;

type FeedItem = BattleEvent & { blockNumber: bigint; logIndex: number };

export async function getBattleActivity(limit = 12): Promise<BattleEvent[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data.slice(0, limit);
  }

  try {
    const latest = await client.getBlockNumber();
    const floor = latest > MAX_LOOKBACK ? latest - MAX_LOOKBACK : 0n;

    const items: FeedItem[] = [];
    let hi = latest;
    while (hi > floor && items.length < limit) {
      const batch: [bigint, bigint][] = [];
      for (let i = 0; i < CONCURRENCY && hi > floor; i++) {
        const lo = hi >= floor + CHUNK - 1n ? hi - CHUNK + 1n : floor;
        batch.push([lo, hi]);
        hi = lo - 1n;
      }

      const windowLogs = await Promise.all(
        batch.map(async ([lo, to]) => {
          const [created, resolved, cancelled] = await Promise.all([
            client.getLogs({ address: BATTLE_ADDRESS, event: DUEL_CREATED, fromBlock: lo, toBlock: to }).catch(() => []),
            client.getLogs({ address: BATTLE_ADDRESS, event: DUEL_RESOLVED, fromBlock: lo, toBlock: to }).catch(() => []),
            client.getLogs({ address: BATTLE_ADDRESS, event: DUEL_CANCELLED, fromBlock: lo, toBlock: to }).catch(() => []),
          ]);
          return { created, resolved, cancelled };
        }),
      );

      for (const { created, resolved, cancelled } of windowLogs) {
        for (const log of created) {
          items.push({
            kind: "created",
            duelId: Number(log.args.id ?? 0n),
            tokenId: Number(log.args.cardA ?? 0n),
            account: String(log.args.a ?? ""),
            stake: log.args.stake !== undefined ? String(log.args.stake) : undefined,
            txHash: log.transactionHash ?? "",
            timestamp: "",
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
          });
        }
        for (const log of resolved) {
          items.push({
            kind: "resolved",
            duelId: Number(log.args.id ?? 0n),
            tokenId: Number(log.args.winCard ?? 0n),
            loseCard: log.args.loseCard !== undefined ? Number(log.args.loseCard) : undefined,
            account: String(log.args.winner ?? ""),
            payout: log.args.payout !== undefined ? String(log.args.payout) : undefined,
            txHash: log.transactionHash ?? "",
            timestamp: "",
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
          });
        }
        for (const log of cancelled) {
          items.push({
            kind: "cancelled",
            duelId: Number(log.args.id ?? 0n),
            tokenId: Number(log.args.cardA ?? 0n),
            account: String(log.args.a ?? ""),
            txHash: log.transactionHash ?? "",
            timestamp: "",
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
          });
        }
      }
    }

    items.sort((a, b) =>
      a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : a.blockNumber < b.blockNumber ? 1 : -1,
    );
    const seen = new Set<string>();
    const uniqueItems = items.filter((it) => {
      const key = `${it.txHash}-${it.kind}-${it.duelId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const uniqueBlocks = [...new Set(uniqueItems.map((i) => Number(i.blockNumber)))];
    const timestamps = new Map<number, string>();
    await Promise.all(
      uniqueBlocks.map(async (bn) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(bn) });
          timestamps.set(bn, new Date(Number(block.timestamp) * 1000).toISOString());
        } catch {
          /* leave blank */
        }
      }),
    );

    const events: BattleEvent[] = uniqueItems.map((item) => ({
      kind: item.kind,
      duelId: item.duelId,
      tokenId: item.tokenId,
      loseCard: item.loseCard,
      account: item.account,
      payout: item.payout,
      stake: item.stake,
      txHash: item.txHash,
      timestamp: timestamps.get(Number(item.blockNumber)) ?? "",
    }));

    cache = { at: Date.now(), data: events };
    return events.slice(0, limit);
  } catch {
    return cache?.data.slice(0, limit) ?? [];
  }
}
