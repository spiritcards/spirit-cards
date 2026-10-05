import type { PublicClient } from "viem";

/**
 * logs.ts — chunked `eth_getLogs` for Robinhood Chain.
 *
 * The RH RPC caps a single `eth_getLogs` query at 10,000,000 blocks
 * ("query spans N blocks … but only 10000000 are allowed"). Every history scan
 * must therefore start at the stack deploy block (`CANON_FROM_BLOCK`) and this
 * helper splits whatever range remains into safe windows.
 */

/** Max window per RPC call (headroom under the 10M cap). */
export const LOGS_CHUNK = 5_000_000n;

type LogsParams = {
  address: `0x${string}`;
  event: unknown;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock: bigint;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/** `client.getLogs` in ≤5M-block windows; results concatenated in order. */
export async function getLogsChunked(client: PublicClient, params: LogsParams): Promise<any[]> {
  const out: any[] = [];
  let lo = params.fromBlock;
  while (lo <= params.toBlock) {
    const hi = lo + LOGS_CHUNK - 1n > params.toBlock ? params.toBlock : lo + LOGS_CHUNK - 1n;
    const part = (await client.getLogs({ ...params, fromBlock: lo, toBlock: hi } as never)) as any[];
    out.push(...part);
    lo = hi + 1n;
  }
  return out;
}
