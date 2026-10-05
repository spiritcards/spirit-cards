import { getAddress, parseAbiItem, type Address, type PublicClient } from "viem";
import { CONTRACT_ADDRESS, POW_MINT_NFT_ABI } from "./contract";
import { CANON_FROM_BLOCK } from "./canonical";
import { getLogsChunked } from "./logs";

/**
 * owned-ids.ts — "which token ids does this wallet own" sweep.
 *
 * Primary path: ERC-721 `Transfer` logs. We collect every id the wallet ever
 * received or sent (2 `eth_getLogs` for the whole collection), then confirm the
 * current owner with a Multicall3 `ownerOf` batch. This is O(wallet activity),
 * not O(totalMinted) — a wallet with 100 cards from packs resolves in one round
 * trip instead of probing thousands of ids. No 500-id cap, no per-card loop.
 *
 * Fallback: if logs are unavailable (RPC gap / no multicall3), it degrades to
 * the full-range `ownerOf` sweep `1..totalMinted` in Multicall3 batches, then to
 * a bounded-concurrency sequential sweep.
 */

const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

/** Ids probed per multicall batch in the fallback sweep. */
export const OWNER_SWEEP_BATCH = 500;
/** Concurrency for the sequential fallback path. */
const FALLBACK_CONCURRENCY = 8;

export type OwnerSweepResult = {
  /** Owned ids, ascending. */
  owned: number[];
  /** Number of ids probed. */
  scanned: number;
  /** "logs" (preferred) · "multicall" · "sequential". */
  mode: "logs" | "multicall" | "sequential";
};

/**
 * Resolve the ids owned by `who`.
 * @param totalMinted only used by the fallback range sweep; the log path ignores it.
 */
export async function sweepOwnedIds(
  client: PublicClient,
  who: Address,
  totalMinted: number,
  onProgress?: (done: number, total: number) => void,
): Promise<OwnerSweepResult> {
  const whoLower = who.toLowerCase();
  const core = getAddress(CONTRACT_ADDRESS);

  // ---- preferred path: Transfer logs + ownerOf confirm --------------------
  try {
    const latest = await client.getBlockNumber();
    const from = BigInt(CANON_FROM_BLOCK);
    const [incoming, outgoing] = await Promise.all([
      getLogsChunked(client, { address: core, event: TRANSFER, args: { to: who }, fromBlock: from, toBlock: latest }),
      getLogsChunked(client, { address: core, event: TRANSFER, args: { from: who }, fromBlock: from, toBlock: latest }),
    ]);
    const candidateIds = new Set<string>();
    for (const log of incoming) if (log.args.tokenId !== undefined) candidateIds.add(log.args.tokenId.toString());
    for (const log of outgoing) if (log.args.tokenId !== undefined) candidateIds.add(log.args.tokenId.toString());

    const ids = [...candidateIds];
    if (ids.length === 0) return { owned: [], scanned: 0, mode: "logs" };

    const results = await client.multicall({
      contracts: ids.map((id) => ({
        address: core,
        abi: POW_MINT_NFT_ABI,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as const,
      })),
      allowFailure: true,
    });

    const owned: number[] = [];
    results.forEach((res, index) => {
      if (res.status === "success" && String(res.result).toLowerCase() === whoLower) {
        owned.push(Number(ids[index]));
      }
    });
    owned.sort((a, b) => a - b);
    onProgress?.(owned.length, owned.length);
    return { owned, scanned: ids.length, mode: "logs" };
  } catch {
    // fall through to the range sweep
  }

  const total = Math.max(0, Math.floor(totalMinted));
  const owned: number[] = [];
  if (total === 0) return { owned, scanned: 0, mode: "multicall" };

  // ---- batched range sweep (Multicall3) -----------------------------------
  try {
    for (let start = 1; start <= total; start += OWNER_SWEEP_BATCH) {
      const end = Math.min(total, start + OWNER_SWEEP_BATCH - 1);
      const ids: number[] = [];
      for (let id = start; id <= end; id++) ids.push(id);

      const results = await client.multicall({
        contracts: ids.map((id) => ({
          address: core,
          abi: POW_MINT_NFT_ABI,
          functionName: "ownerOf" as const,
          args: [BigInt(id)] as const,
        })),
        allowFailure: true,
      });

      results.forEach((res, index) => {
        if (res.status === "success" && String(res.result).toLowerCase() === whoLower) {
          owned.push(ids[index]);
        }
      });

      onProgress?.(end, total);
    }
    return { owned, scanned: total, mode: "multicall" };
  } catch {
    owned.length = 0;
  }

  // ---- sequential fallback ------------------------------------------------
  let next = 1;
  let done = 0;
  const worker = async () => {
    while (true) {
      const id = next++;
      if (id > total) return;
      try {
        const owner = await client.readContract({
          address: core,
          abi: POW_MINT_NFT_ABI,
          functionName: "ownerOf",
          args: [BigInt(id)],
        });
        if (String(owner).toLowerCase() === whoLower) owned.push(id);
      } catch {
        // burned or not minted — skip silently
      }
      done += 1;
      onProgress?.(done, total);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(FALLBACK_CONCURRENCY, total) }, worker),
  );
  owned.sort((a, b) => a - b);
  return { owned, scanned: total, mode: "sequential" };
}
