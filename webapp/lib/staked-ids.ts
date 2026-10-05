import { getAddress, parseAbiItem, type Address, type PublicClient } from "viem";
import { CORE_ADDRESS, VAULT_ADDRESS, STAKE_VAULT_ABI } from "./poc";
import { CANON_FROM_BLOCK } from "./canonical";
import { getLogsChunked } from "./logs";

/**
 * staked-ids.ts — "which token ids does this wallet have staked in the vault".
 *
 * A staked card is owned by the StakeVault, so the plain `sweepOwnedIds` sweep
 * misses it. We reuse the same Transfer-log trick (a vault stake always follows
 * a `user -> vault` transfer), then confirm on-chain: ownerOf == vault, the
 * stake is active and its user is `who`. Also reports whether the card is
 * currently locked inside a duel (`inBattle`) so the UI can disable it.
 */

const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

const OWNER_OF_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Ids probed per multicall batch. */
const BATCH = 400;

export type StakedCard = { id: number; inBattle: boolean };

/** Resolve the ids staked by `who` (owner = vault, active stake, user = who). */
export async function sweepStakedIds(
  client: PublicClient,
  who: Address,
  onProgress?: (done: number, total: number) => void,
): Promise<StakedCard[]> {
  const whoLower = who.toLowerCase();
  const core = getAddress(CORE_ADDRESS);
  const vault = getAddress(VAULT_ADDRESS);

  const candidates = new Set<string>();
  try {
    const latest = await client.getBlockNumber();
    const from = BigInt(CANON_FROM_BLOCK);
    const [outgoing, incoming] = await Promise.all([
      getLogsChunked(client, { address: core, event: TRANSFER, args: { from: who }, fromBlock: from, toBlock: latest }),
      getLogsChunked(client, { address: core, event: TRANSFER, args: { to: who }, fromBlock: from, toBlock: latest }),
    ]);
    for (const log of [...outgoing, ...incoming]) {
      if (log.args.tokenId !== undefined) candidates.add(log.args.tokenId.toString());
    }
  } catch {
    return []; // no logs → cannot enumerate staked ids safely
  }

  const ids = [...candidates];
  if (ids.length === 0) return [];

  // ownerOf(id) == vault ?
  const vaultOwned: string[] = [];
  for (let start = 0; start < ids.length; start += BATCH) {
    const slice = ids.slice(start, start + BATCH);
    const res = await client.multicall({
      contracts: slice.map((id) => ({
        address: core,
        abi: OWNER_OF_ABI,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as const,
      })),
      allowFailure: true,
    });
    res.forEach((r, i) => {
      if (r.status === "success" && String(r.result).toLowerCase() === vault.toLowerCase()) {
        vaultOwned.push(slice[i]);
      }
    });
    onProgress?.(Math.min(start + BATCH, ids.length), ids.length);
  }
  if (vaultOwned.length === 0) return [];

  // stakes(id) active && user == who ?
  const staked: string[] = [];
  for (let start = 0; start < vaultOwned.length; start += BATCH) {
    const slice = vaultOwned.slice(start, start + BATCH);
    const res = await client.multicall({
      contracts: slice.map((id) => ({
        address: vault,
        abi: STAKE_VAULT_ABI,
        functionName: "stakes" as const,
        args: [BigInt(id)] as const,
      })),
      allowFailure: true,
    });
    res.forEach((r, i) => {
      if (r.status !== "success") return;
      const tuple = r.result as readonly [Address, bigint, bigint, bigint, bigint, boolean];
      const user = String(tuple[0]).toLowerCase();
      if (tuple[5] === true && user === whoLower) staked.push(slice[i]);
    });
  }
  if (staked.length === 0) return [];

  // inBattle(id) ?
  const flags = await client.multicall({
    contracts: staked.map((id) => ({
      address: vault,
      abi: STAKE_VAULT_ABI,
      functionName: "inBattle" as const,
      args: [BigInt(id)] as const,
    })),
    allowFailure: true,
  });

  const out: StakedCard[] = staked.map((id, i) => ({
    id: Number(id),
    inBattle: flags[i].status === "success" ? Boolean(flags[i].result) : false,
  }));
  out.sort((a, b) => a.id - b.id);
  return out;
}
