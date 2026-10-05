#!/usr/bin/env node
// mine.mjs — Spirit Cards PoW miner (CLI).
//
// Finds a nonce for: keccak256(chainId || contract || miner || nonce) with
// leadingZeroBits >= baseBits, then (with --mine) signs & broadcasts
// SpiritCards.mine(nonce, useChip) with value = currentPrice().
//
// Examples:
//   node mine.mjs --help
//   node mine.mjs                                   # dry-run, ephemeral miner addr
//   node mine.mjs --base-bits 20                     # dry-run, explicit difficulty
//   node mine.mjs --key 0xabc... --mine              # real mint (needs testnet ETH)
//   MINER_KEY=0xabc... node mine.mjs --mine --count 3
//
// Safety: NEVER commit or paste your private key into shared logs.

import { randomBytes } from 'node:crypto';
import process from 'node:process';
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { buildPrefix, bytesToHex, hexToBytes, search, verifyNonce } from './pow.mjs';

// ---------------------------------------------------------------------------
// Defaults (Robinhood Chain mainnet / Spirit Cards t9 deployment)
// ---------------------------------------------------------------------------
const DEFAULTS = {
  rpc: process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com',
  contract: process.env.POC_ADDRESS || '0x0997DB0BEa2c1278063ebBEc0d1cdbecE7B6F021',
  config: process.env.CONFIG_ADDRESS || '0x678629B80ab8A3Bc049e0FaBca7Aa5De826c8819',
  explorer: process.env.EXPLORER || 'https://robinhoodchain.blockscout.com',
};

const POC_ABI = parseAbi([
  'function mine(uint256 nonce, bool useChip) payable',
  'function currentPrice() view returns (uint256)',
  'function requiredBits() view returns (uint256)',
  'function chip() view returns (address)',
  'function lastMintAt(address) view returns (uint256)',
]);
const CONFIG_ABI = parseAbi([
  'function baseBits() view returns (uint256)',
  'function chipDiscountBps() view returns (uint256)',
  'function mineCooldown() view returns (uint256)',
  'function paused() view returns (bool)',
]);
const CHIP_ABI = parseAbi(['function balanceOf(address,uint256) view returns (uint256)']);

const HELP = `Spirit Cards miner — finds a valid PoW nonce and (optionally) mints.

USAGE
  node mine.mjs [options]

OPTIONS
  --rpc <url>          RPC endpoint            (default: ${DEFAULTS.rpc})
  --contract <addr>    SpiritCards address     (default: ${DEFAULTS.contract})
  --config <addr>      Config address          (default: ${DEFAULTS.config})
  --explorer <url>     Explorer base URL       (default: ${DEFAULTS.explorer})
  --key <hex>          Miner private key (0x...). Env: MINER_KEY
  --base-bits <n>      Required leading zero bits (default: read Config.baseBits())
  --use-chip           Spend 1 chip for the discount (mine(nonce,true))
  --mine               Actually sign & broadcast (otherwise dry-run only)
  --count <n>          Number of mints to find/send sequentially (default 1)
  -h, --help           Show this help

NOTES
  * Without --key a random THROWAWAY address is used: the nonce found is NOT
    valid for a real mint. Use it only to measure your hashrate.
  * Fees are auto-filled; the gas limit is pinned to 600000 (the RPC's
    eth_estimateGas is flaky). Override with GAS_LIMIT env.

ENV
  MINER_KEY     private key (same as --key)
  RPC_URL / POC_ADDRESS / CONFIG_ADDRESS / EXPLORER / GAS_LIMIT
`;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { out.help = true; continue; }
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (val === undefined) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { val = next; i++; }
      else val = true;
    }
    out[key] = val;
  }
  return out;
}

const fmtHashrate = (h) =>
  h >= 1e6 ? `${(h / 1e6).toFixed(2)} MH/s` : h >= 1e3 ? `${(h / 1e3).toFixed(1)} kH/s` : `${h.toFixed(0)} H/s`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const with0x = (k) => (String(k).trim().startsWith('0x') ? String(k).trim() : '0x' + String(k).trim());
const flag = (v) => v === true || v === 'true' || v === '1';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }

  const rpc = args.rpc !== undefined && args.rpc !== true ? String(args.rpc) : DEFAULTS.rpc;
  const contract = args.contract !== undefined && args.contract !== true ? String(args.contract) : DEFAULTS.contract;
  const config = args.config !== undefined && args.config !== true ? String(args.config) : DEFAULTS.config;
  const explorer = args.explorer !== undefined && args.explorer !== true ? String(args.explorer) : DEFAULTS.explorer;
  const doMine = flag(args.mine);
  const useChip = flag(args['use-chip']);
  const count = Math.max(1, parseInt(args.count ?? '1', 10) || 1);
  const gasLimit = BigInt(process.env.GAS_LIMIT || '600000');

  const rawKey = (args.key && args.key !== true ? String(args.key) : process.env.MINER_KEY || '').trim();
  const haveKey = rawKey.length > 0;
  if (doMine && !haveKey) {
    console.error('ERROR: --mine requires --key (or MINER_KEY env). Refusing to broadcast without a key.');
    process.exit(1);
  }

  const account = haveKey
    ? privateKeyToAccount(with0x(rawKey))
    : privateKeyToAccount('0x' + randomBytes(32).toString('hex'));

  const chain = {
    id: 46630,
    name: 'Robinhood Chain Testnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  };
  const pub = createPublicClient({ chain, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain, transport: http(rpc) });

  console.log('Spirit Cards miner');
  console.log('  rpc       :', rpc);
  console.log('  contract  :', contract);
  console.log('  config    :', config);
  console.log('  miner     :', account.address, haveKey ? '' : '(throwaway)');
  console.log('  mode      :', doMine ? `BROADCAST x${count}${useChip ? ' (useChip)' : ''}` : 'dry-run');
  if (!haveKey) {
    console.log('  [note]    : no key → nonces found here are NOT valid for a real mint.');
  }

  // chainId (authoritative, straight from the RPC)
  let chainId;
  try {
    chainId = await pub.getChainId();
  } catch (e) {
    console.error('ERROR: cannot reach RPC / eth_chainId:', e.shortMessage || e.message);
    process.exit(2);
  }
  console.log('  chainId   :', chainId, chainId === chain.id ? '' : `(warning: expected ${chain.id})`);

  // difficulty: explicit, or auto-read from the core contract (era-aware requiredBits)
  let baseBits;
  if (args['base-bits'] !== undefined && args['base-bits'] !== true) {
    baseBits = parseInt(args['base-bits'], 10);
  } else {
    try {
      baseBits = Number(await pub.readContract({ address: contract, abi: POC_ABI, functionName: 'requiredBits' }));
      console.log(`  requiredBits: ${baseBits} (auto-read from SpiritCards, era-aware)`);
    } catch (e) {
      console.error('ERROR: could not read SpiritCards.requiredBits(); pass --base-bits manually.', e.shortMessage || e.message);
      process.exit(2);
    }
  }
  if (!Number.isInteger(baseBits) || baseBits <= 0 || baseBits > 255) {
    console.error('ERROR: invalid --base-bits', baseBits);
    process.exit(1);
  }
  console.log(`  baseBits  : ${baseBits}`);

  const prefix = buildPrefix(chainId, contract, account.address);

  if (doMine) await preflight(pub, contract, config, account.address, useChip);

  for (let i = 0; i < count; i++) {
    const start = randomBytes(32);
    const label = count > 1 ? ` [${i + 1}/${count}]` : '';
    console.log(`\nMining${label} … (target ${baseBits} bits, expected ≈ ${(2 ** baseBits).toLocaleString()} hashes)`);

    let lastLog = 0;
    const res = search(prefix, start, baseBits, {
      onProgress: (p) => {
        const now = Date.now();
        if (now - lastLog > 1000) {
          lastLog = now;
          process.stdout.write(
            `  … ${p.attempts.toLocaleString()} tries · ${fmtHashrate(p.hashrate)} · ${(p.elapsedMs / 1000).toFixed(1)}s\r`,
          );
        }
      },
    });

    process.stdout.write(' '.repeat(70) + '\r');
    console.log(`  found nonce : ${res.nonceHex}  (dec ${BigInt(res.nonceHex)})`);
    console.log(`  attempts    : ${res.attempts.toLocaleString()}`);
    console.log(`  work        : ${res.work}`);
    console.log(`  bits        : ${res.bits}  (>= ${baseBits} ✔)`);
    console.log(`  time        : ${(res.elapsedMs / 1000).toFixed(3)} s`);
    console.log(`  hashrate    : ${fmtHashrate(res.hashrate)}`);

    // self-verify with the exact contract encoding
    const chk = verifyNonce(prefix, hexToBytes(res.nonceHex), baseBits);
    if (!chk.ok) { console.error('INTERNAL ERROR: self-verify failed'); process.exit(3); }

    if (doMine) {
      await doBroadcast(pub, wallet, contract, config, explorer, account, res.nonceBytes, useChip, gasLimit);
      if (i < count - 1) await sleepForCooldown(pub, contract, config, account.address);
    }
  }

  if (!doMine) {
    console.log('\nDry-run only. Re-run with --mine (and a funded --key) to actually mint.');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function preflight(pub, contract, config, miner, useChip) {
  console.log('\nPreflight:');
  try {
    const [paused, price, cooldown, lastMint, chipAddr] = await Promise.all([
      pub.readContract({ address: config, abi: CONFIG_ABI, functionName: 'paused' }).catch(() => null),
      pub.readContract({ address: contract, abi: POC_ABI, functionName: 'currentPrice' }).catch(() => null),
      pub.readContract({ address: config, abi: CONFIG_ABI, functionName: 'mineCooldown' }).catch(() => null),
      pub.readContract({ address: contract, abi: POC_ABI, functionName: 'lastMintAt', args: [miner] }).catch(() => null),
      pub.readContract({ address: contract, abi: POC_ABI, functionName: 'chip' }).catch(() => null),
    ]);
    if (paused !== null) console.log('  paused      :', paused);
    if (price !== null) console.log('  price       :', formatEther(price), 'ETH');
    if (cooldown !== null && lastMint !== null) {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const ready = BigInt(lastMint) + BigInt(cooldown);
      console.log('  cooldown    :', cooldown.toString(), 's', now >= ready ? '(ready)' : `(wait ~${ready - now}s)`);
    }
    if (useChip && chipAddr) {
      const bal = await pub
        .readContract({ address: chipAddr, abi: CHIP_ABI, functionName: 'balanceOf', args: [miner, 0n] })
        .catch(() => null);
      console.log('  chip balance:', bal === null ? 'n/a' : bal.toString());
      if (bal === 0n) console.warn('  [warn] --use-chip set but you hold 0 chips → tx will revert (NO_CHIP).');
    }
  } catch (e) {
    console.warn('  [warn] preflight skipped:', e.shortMessage || e.message);
  }
}

async function sleepForCooldown(pub, contract, config, miner) {
  try {
    const cooldown = BigInt(await pub.readContract({ address: config, abi: CONFIG_ABI, functionName: 'mineCooldown' }));
    const last = BigInt(await pub.readContract({ address: contract, abi: POC_ABI, functionName: 'lastMintAt', args: [miner] }));
    const block = await pub.getBlock();
    const wait = Number(last + cooldown - block.timestamp) + 1;
    if (wait > 0) {
      console.log(`  sleeping ${wait}s (per-wallet cooldown) …`);
      await sleep(wait * 1000);
    }
  } catch {
    await sleep(1000); // contract enforces cooldown anyway
  }
}

async function doBroadcast(pub, wallet, contract, config, explorer, account, nonceBytes, useChip, gasLimit) {
  let price;
  try {
    price = await pub.readContract({ address: contract, abi: POC_ABI, functionName: 'currentPrice' });
  } catch (e) {
    console.error('  broadcast aborted: cannot read currentPrice()', e.shortMessage || e.message);
    return;
  }

  let due = price;
  if (useChip) {
    try {
      const disc = await pub.readContract({ address: config, abi: CONFIG_ABI, functionName: 'chipDiscountBps' });
      due = price - (price * BigInt(disc)) / 10000n;
    } catch { /* fall through with full price */ }
  }

  const nonceBig = BigInt(bytesToHex(nonceBytes)); // 0x… hex -> bigint
  const data = encodeFunctionData({ abi: POC_ABI, functionName: 'mine', args: [nonceBig, useChip] });

  console.log(`  sending mine(${nonceBig}, ${useChip}) value=${formatEther(due)} ETH, gas=${gasLimit} …`);
  try {
    const hash = await wallet.sendTransaction({ to: contract, data, value: due, gas: gasLimit, account, chain: wallet.chain });
    console.log('  tx hash     :', hash);
    console.log('  explorer    :', `${explorer.replace(/\/$/, '')}/tx/${hash}`);
    const rec = await pub.waitForTransactionReceipt({ hash }).catch(() => null);
    if (rec) console.log('  status      :', rec.status, rec.status === 'success' ? '✔ minted' : '✗ reverted');
  } catch (e) {
    console.error('  send failed  :', e.shortMessage || e.message);
    if (e.cause) console.error('  cause        :', e.cause.shortMessage || e.cause.message);
  }
}

main().catch((e) => {
  console.error('FATAL:', e?.stack || e);
  process.exit(1);
});
