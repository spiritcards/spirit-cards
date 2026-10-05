#!/usr/bin/env node
// measure.mjs — pure PoW benchmark for Spirit Cards.
//
// Measures raw keccak hashrate of THIS machine on the exact contract input
// (chainId || contract || miner || nonce, 104 bytes) and prints the expected
// average time to find a nonce for a range of difficulty (baseBits) values.
//
//   node measure.mjs            # ~3s sample (default)
//   node measure.mjs --seconds 5
//
// No network, no keys. Safe to run anywhere.

import process from 'node:process';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { buildPrefix, benchmark } from './pow.mjs';

// real mainnet parameters so the hashed bytes match the live contract (t9)
const CHAIN_ID = 4663n;
const CONTRACT = '0x0997DB0BEa2c1278063ebBEc0d1cdbecE7B6F021';

const BITS = [16, 18, 20, 22, 24];

function parseSeconds() {
  const i = process.argv.indexOf('--seconds');
  if (i !== -1 && process.argv[i + 1]) return Math.max(1, parseInt(process.argv[i + 1], 10) || 3);
  const eq = process.argv.find((a) => a.startsWith('--seconds='));
  if (eq) return Math.max(1, parseInt(eq.split('=')[1], 10) || 3);
  return 3;
}

function humanTime(seconds) {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

function main() {
  const seconds = parseSeconds();
  // ephemeral miner address (throwaway) — hashing cost is identical to any address
  const miner = '0x' + randomBytes(20).toString('hex');
  const prefix = buildPrefix(CHAIN_ID, CONTRACT, miner);

  const cpu = (os.cpus()[0]?.model || 'unknown CPU').trim();
  const cores = os.cpus().length;

  console.log('Spirit Cards — PoW benchmark');
  console.log('  host        :', os.hostname());
  console.log('  cpu         :', `${cpu} (${cores} threads)`);
  console.log('  node        :', process.version);
  console.log('  input       :', `keccak256(chainId=${CHAIN_ID} || ${CONTRACT} || miner || nonce), 104 bytes`);
  console.log('  sample      :', `${seconds}s warm + ${seconds}s measured`);
  console.log('');

  // warm-up (JIT), not counted
  process.stdout.write('  warming up …\r');
  benchmark(prefix, Math.min(1000, seconds * 1000));

  process.stdout.write('  measuring …\r');
  const { attempts, elapsedMs, hashrate } = benchmark(prefix, seconds * 1000);

  console.log(`  hashrate    : ${(hashrate / 1000).toFixed(1)} kH/s  (${hashrate.toFixed(0)} H/s)`);
  console.log(`  measured    : ${attempts.toLocaleString()} hashes in ${(elapsedMs / 1000).toFixed(2)}s`);
  console.log('');
  console.log('  Expected average time to find a valid nonce = 2^bits / hashrate');
  console.log('  (leadingZeroBits(work) >= baseBits; success probability per hash = 2^-baseBits)');
  console.log('');
  console.log('  ┌──────────┬───────────────────┬──────────────────────────────┐');
  console.log('  │ baseBits │ expected attempts │ expected avg time (this CPU)  │');
  console.log('  ├──────────┼───────────────────┼──────────────────────────────┤');
  for (const bits of BITS) {
    const need = Math.pow(2, bits);
    const secs = need / hashrate;
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`  │ ${pad(bits, 8)} │ ${pad(need.toLocaleString(), 17)} │ ${pad(humanTime(secs), 28)} │`);
  }
  console.log('  └──────────┴───────────────────┴──────────────────────────────┘');
  console.log('');
  console.log('  Note: single-threaded, pure-JS keccak. A phone is typically 5–20× slower;');
  console.log('  a GPU (via a native keccak backend) can be 10–100× faster. Measure your device.');
}

main();
