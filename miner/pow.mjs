// pow.mjs — Spirit Cards PoW core (EXACT match to the on-chain contract).
//
// On-chain (SpiritCards.sol):
//   work = keccak256(abi.encodePacked(block.chainid, address(this), miner, nonce))
//   valid iff leadingZeroBits(work) >= config.baseBits()
//
// abi.encodePacked layout (104 bytes total, NO padding between fields):
//   [ 0 .. 32) chainId  uint256 -> 32 bytes big-endian
//   [32 .. 52) contract address   -> 20 bytes
//   [52 .. 72) miner    address   -> 20 bytes
//   [72 ..104) nonce    uint256   -> 32 bytes big-endian
//
// Pure JS keccak (js-sha3) — no native builds, works on any Node.

import sha3 from 'js-sha3';
const keccak256 = sha3.keccak256;

export const PREFIX_LEN = 72;
export const BUF_LEN = 104;

/** Hex string (0x-optional) -> Uint8Array. */
export function hexToBytes(hex) {
  let h = String(hex).trim().replace(/^0x/i, '');
  if (h.length & 1) h = '0' + h; // odd length -> left-pad
  const out = new Uint8Array(h.length >> 1);
  for (let i = 0; i < out.length; i++) {
    const b = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(b)) throw new Error(`bad hex: ${hex}`);
    out[i] = b;
  }
  return out;
}

/** Uint8Array -> 0x-prefixed lowercase hex. */
export function bytesToHex(bytes) {
  let s = '0x';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/** bigint/number -> 32-byte big-endian Uint8Array. */
export function bigintToBytes32(value) {
  let x = BigInt(value);
  if (x < 0n) throw new Error('negative');
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

/** A valid 20-byte address (0x + 40 hex). Throws otherwise. */
export function normalizeAddress(addr) {
  const h = String(addr).trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(h)) throw new Error(`bad address: ${addr}`);
  return h.toLowerCase();
}

/** Build the 72-byte fixed prefix (chainId || contract || miner). */
export function buildPrefix(chainId, contract, miner) {
  const contractBytes = hexToBytes(normalizeAddress(contract));
  const minerBytes = hexToBytes(normalizeAddress(miner));
  const prefix = new Uint8Array(PREFIX_LEN);
  prefix.set(bigintToBytes32(chainId), 0);      // [0..32)  chainId
  prefix.set(contractBytes, 32);                 // [32..52) contract
  prefix.set(minerBytes, 52);                    // [52..72) miner
  return prefix;
}

/**
 * leadingZeroBits of a 32-byte keccak digest given as hex.
 * Mirrors the contract's bit-scan: 0x00 -> 8, 0x01 -> 7, 0x0f -> 0, etc.
 */
export function leadingZeroBitsHex(hex) {
  let count = 0;
  for (let i = 0; i < hex.length; i++) {
    const c = hex.charCodeAt(i);
    let nib;
    if (c >= 48 && c <= 57) nib = c - 48;          // 0-9
    else if (c >= 97 && c <= 102) nib = c - 87;    // a-f
    else if (c >= 65 && c <= 70) nib = c - 55;     // A-F
    else continue;                                  // skip 0x prefix etc.
    if (nib === 0) {
      count += 4;
      continue;
    }
    count += Math.clz32(nib) - 28;                  // 0..3 leading bits in the nibble
    return count;
  }
  return count; // digest was all zeroes
}

/** keccak256 of (prefix || nonce32) as hex. nonceBytes is a Uint8Array(32). */
export function hashOnce(prefix, nonceBytes) {
  const buf = new Uint8Array(BUF_LEN);
  buf.set(prefix, 0);
  buf.set(nonceBytes, PREFIX_LEN);
  return keccak256(buf);
}

/** Verify a candidate nonce against a target bit count. Returns {ok, work, bits}. */
export function verifyNonce(prefix, nonceBytes, baseBits) {
  const work = hashOnce(prefix, nonceBytes);
  const bits = leadingZeroBitsHex(work);
  return { ok: bits >= baseBits, work, bits };
}

/**
 * Hot search loop. Finds a nonce with leadingZeroBits >= baseBits.
 *
 * @param {Uint8Array} prefix        72-byte prefix from buildPrefix()
 * @param {Uint8Array} startNonce    32-byte starting nonce (mutated copy used)
 * @param {number}     baseBits      target leading zero bits
 * @param {object}    [opts]
 * @param {(s:Progress)=>void} [opts.onProgress] called roughly every ~8192 tries
 * @param {()=>boolean} [opts.shouldStop]      polled roughly every ~8192 tries
 * @param {number}    [opts.maxAttempts]       hard cap (0 = unlimited)
 * @returns {{found:boolean, nonceBytes:Uint8Array, nonceHex:string, work:string|null, bits:number, attempts:number, elapsedMs:number, hashrate:number}}
 */
export function search(prefix, startNonce, baseBits, opts = {}) {
  const buf = new Uint8Array(BUF_LEN);
  buf.set(prefix, 0);

  const nonce = new Uint8Array(32);
  nonce.set(startNonce, 0);
  buf.set(nonce, PREFIX_LEN);

  const t0 = process.hrtime.bigint();
  const onProgress = opts.onProgress || null;
  const shouldStop = opts.shouldStop || null;
  const maxAttempts = opts.maxAttempts || 0;
  const CHUNK = 8192;

  let attempts = 0;
  for (;;) {
    for (let i = 0; i < CHUNK; i++) {
      const work = keccak256(buf);
      attempts++;
      const bits = leadingZeroBitsHex(work);
      if (bits >= baseBits) {
        const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
        return {
          found: true,
          nonceBytes: nonce.slice(),
          nonceHex: bytesToHex(nonce),
          work,
          bits,
          attempts,
          elapsedMs,
          hashrate: attempts / (elapsedMs / 1000),
        };
      }
      // increment nonce (big-endian) then write low bytes back into the buffer.
      // NB: must reassign and read back — `++nonce[k]` on a typed array yields the
      // un-clamped value (256) on wrap, which would skip the carry entirely.
      for (let k = 31; k >= 0; k--) {
        nonce[k] = (nonce[k] + 1) & 0xff;
        if (nonce[k] !== 0) break;
      }
      buf.set(nonce, PREFIX_LEN);
    }

    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
    if (onProgress) onProgress({ attempts, elapsedMs, hashrate: attempts / (elapsedMs / 1000) });
    if (maxAttempts && attempts >= maxAttempts) {
      return { found: false, nonceBytes: nonce.slice(), nonceHex: bytesToHex(nonce), work: null, bits: 0, attempts, elapsedMs, hashrate: attempts / (elapsedMs / 1000) };
    }
    if (shouldStop && shouldStop()) {
      return { found: false, nonceBytes: nonce.slice(), nonceHex: bytesToHex(nonce), work: null, bits: 0, attempts, elapsedMs, hashrate: attempts / (elapsedMs / 1000) };
    }
  }
}

/** Pure benchmark: hash for `ms` milliseconds, return measured hashrate. */
export function benchmark(prefix, ms = 3000) {
  const startNonce = new Uint8Array(32);
  const deadline = process.hrtime.bigint() + BigInt(Math.max(1, ms)) * 1_000_000n;
  const res = search(prefix, startNonce, 256 /* unreachable target */, {
    shouldStop: () => process.hrtime.bigint() >= deadline,
  });
  return { attempts: res.attempts, elapsedMs: res.elapsedMs, hashrate: res.hashrate };
}
