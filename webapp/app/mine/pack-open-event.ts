import { decodeEventLog, type Hex } from "viem";

/** The existing Packs contract event. This module never submits transactions. */
const PACK_OPENED_ABI = [{
  type: "event", name: "PackOpened", anonymous: false,
  inputs: [
    { name: "buyer", type: "address", indexed: true },
    { name: "size", type: "uint256", indexed: false },
    { name: "firstId", type: "uint256", indexed: false },
    { name: "paid", type: "uint256", indexed: false },
    { name: "discountBps", type: "uint256", indexed: false },
  ],
}] as const;

export const PACK_SIZES = [5, 10, 25, 50, 100] as const;
export type PackSize = typeof PACK_SIZES[number];
export type PackReveal = Readonly<{
  tierIndex: number;
  size: PackSize;
  firstId: string;
  ids: readonly string[];
}>;

type ReceiptLike = {
  status: string;
  logs: readonly { address: string; data: Hex; topics: readonly Hex[] }[];
};

type DecodeResult =
  | { ok: true; reveal: PackReveal }
  | { ok: false; reason: "receipt_not_successful" | "invalid_request" | "event_not_found" | "ambiguous_events" };

/**
 * Call AFTER waitForTransactionReceipt and a successful receipt, using the buyer
 * and tier captured when that purchase began (not a subsequently switched wallet).
 * The host owns error UI, persistence, refreshStats and any transaction deduplication.
 * Failure to decode must NOT turn a confirmed purchase into a failed purchase.
 */
export function decodeConfirmedPack(
  receipt: ReceiptLike,
  request: { packsAddress: string; buyer: string; tierIndex: number; requestedSize: PackSize },
): DecodeResult {
  if (receipt.status !== "success") return { ok: false, reason: "receipt_not_successful" };
  const addressPattern = /^0x[0-9a-fA-F]{40}$/;
  if (!addressPattern.test(request.packsAddress) || !addressPattern.test(request.buyer) ||
      !Number.isInteger(request.tierIndex) || PACK_SIZES[request.tierIndex] !== request.requestedSize) {
    return { ok: false, reason: "invalid_request" };
  }
  const one = BigInt(1);
  const maxUint256 = (one << BigInt(256)) - one;
  const matching: PackReveal[] = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== request.packsAddress.toLowerCase() || log.topics.length === 0) continue;
    try {
      // A receipt can contain unrelated or malformed logs before the wanted event.
      const event = decodeEventLog({
        abi: PACK_OPENED_ABI,
        eventName: "PackOpened",
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]],
        strict: true,
      });
      const { buyer, size, firstId } = event.args;
      if (buyer.toLowerCase() !== request.buyer.toLowerCase() || size !== BigInt(request.requestedSize)) continue;
      if (firstId < BigInt(0) || firstId + size - one > maxUint256) continue;
      // Only the bounded pack size is a Number. Token IDs remain exact decimal strings.
      const ids = Object.freeze(Array.from({ length: request.requestedSize }, (_, index) =>
        (firstId + BigInt(index)).toString()));
      matching.push(Object.freeze({ tierIndex: request.tierIndex, size: request.requestedSize,
        firstId: firstId.toString(), ids }));
    } catch {
      // Another event from Packs is not an error. Keep looking through every log.
    }
  }
  if (matching.length === 0) return { ok: false, reason: "event_not_found" };
  if (matching.length !== 1) return { ok: false, reason: "ambiguous_events" };
  return { ok: true, reveal: matching[0] };
}
