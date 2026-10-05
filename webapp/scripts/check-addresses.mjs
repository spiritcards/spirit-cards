#!/usr/bin/env node
/**
 * check-addresses.mjs — address-sync gate (single source of truth).
 *
 * WHY: address drift is exactly how the "OpenSea vs site" class of bugs starts.
 * The canonical set lives in ONE place (webapp/lib/canonical.ts); any superseded
 * (STALE) contract address lingering in an active file is a FAILURE.
 *
 * HOW:
 *  - Canonical set parsed from webapp/lib/canonical.ts.
 *  - Active surfaces (webapp/lib, webapp/app, ops, root docs) scanned for STALE.
 *  - A few key files MUST carry / import the canonical core.
 *  - Non-canonical 40-hex values are informational (test vectors, wallet addrs).
 *
 * Exit 1 on any stale address or missing canon. Run: npm run check:addresses
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(HERE, "..", ".."); // webapp/scripts -> project root

// --- canonical set (single source of truth) --------------------------------
const CANON_FILE = join(ROOT, "webapp", "lib", "canonical.ts");
const canonSrc = readFileSync(CANON_FILE, "utf8");
const CANON = new Set(
  (canonSrc.match(/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g) || []).map((a) =>
    a.toLowerCase(),
  ),
);
const CANON_CORE = "0x0997DB0BEa2c1278063ebBEc0d1cdbecE7B6F021";

// --- superseded deployments: must NOT appear in active files ----------------
const STALE = [
  "0x2e70b9A7E6b926Fc8f7eA87198193941C0c1C883", // core t2
  "0x9249072Fe3DC05D4e0A2189e2e4d4f7CE8735fF0", // config t2
  "0x46556f14fa804051E77EA3Bba06D02D702a8dE86", // chip t2
  "0xeD0293a74393094A29eDB17fE3EDec5161B2F880", // vault t2
  "0x5eBd8BA433780348B82Fb6FC072161b362e37c65", // battle t2
  "0x3CB33658dDa33AfEB983f9eCeac20EcBBCe954eb", // points t2
  "0xe04857C8CBFc89963f00524fBbd0f97dcB50c6bA", // packs t2
  "0x25dF331C58158e943C5Cce2487B69c3948f49fC5", // core t3
  "0x1011640604a6501d32715555ED8B37B691d98091", // config t3
  "0xF0eE37e2AB88DE9500eE5cB0d845364C33a5045C", // chip t3
  "0xBE3a5D8050F9d82a2C8Ebb556475318AD45C9287", // vault t3
  "0x89458939D00BcEF4614B9A36eD980D2777D9B3B6", // battle t3
  "0xdbe535459769EaE97e796b995fd0405fBd2A6A80", // points t3
  "0xa301DAbc34B2e0515f86313e7349dE5e39de453E", // packs t3
  "0xc0af9BaCD398A85C4d51F39b1E7Bf35f9A916daE", // core t4
  "0xCb46A0F5dEbff9AA5d68b8c192a3777f62cBA9D4", // config t4
  "0x9b027B0981BD1aAEE4f857725C0A9a6A0beA4F4f", // chip t4
  "0xAF0ff39C5d6182895C41cE581d894b07D4c1BC24", // vault t4
  "0xb7c2646cA371f9A622a22C34D091997812c53b1F", // battle t4
  "0x4495520e1aBF37C80714582d11cBdB1BE80404c0", // points t4
  "0x187451f587DD3CD4E842EB79bBb0C28b3A7C9dd2", // packs t4
  "0xfFBe720cCb66aCd920E87a6dae46a3D2cc77f13e", // core t5
  "0xe8657AF46b0176A7854ce5dab91df94dCaa5F24A", // config t5
  "0xbaa6d23c75B4bC2e8a34550119857d5c247a2dF0", // chip t5
  "0x6636D3C4E1A8748f246F2b37136c41C1CF37Af2e", // vault t5
  "0x891C76624494B2832AB0E4f664585C04fb59A85b", // battle t5
  "0xff6B66E6f7cca1479548197cf769F411074C8159", // points t5
  "0x189eD6F1790729C1B14c014B6a7D9fC11273562C", // packs t5
  "0x7C066B0Ae5e13eBbBCBe268bE0594006824697FF", // core t6
  "0x2E02458001EbDE605b3c9172bFDBea7786e72642", // config t6
  "0x1daA2F8E067EE33193E7298E57328D8f8b5464A8", // chip t6
  "0x5cD39B2424f5F5671A68FAb29db7D3d5655C3228", // vault t6
  "0xbe646BF4fEd3F65579544248DD2Ef625a6ABd900", // battle t6
  "0xf8D4593b562365d462ddd6Bdc5A9D382E4B2fEB1", // points t6
  "0x6388E9B1638593BB25C414cAeD60E52D9D5443E0", // packs t6
  "0xeD628d2c353cB2071DD243E067C94516F38572d9", // core t7
  "0x4ac4f6850D7b25688636d1A2a903721cDE8Ef72d", // config t7
  "0x7b8cbA0FA17b8d5982B6e33EB4d31fb5115527c7", // chip t7
  "0xf41AcCFcC3A1A3225133F9C261b76Ca4a7651B54", // vault t7
  "0xAe8bDD77F59d3684A25Eb21ab2dAe980aa1710Bb", // battle t7
  "0x6327Ed72071B223f786Cc5BF053516F667F97119", // points t7
  "0x521eE1759F1842Cd81962c068Ec5e9eB708FDf2A", // packs t7
  "0xAb4cCECaC61Be7bEc6389FF3A215E804E1A1cD46", // core t8 (testnet)
  "0x09a24a40210BCed6e62794862175390c229Aa9b1", // config t8
  "0x596FA37213781f08fD33ad5c0B7A79684852Ed01", // chip t8
  "0x877E2df6691bCb1f4EECf999444B08711c89e0f8", // vault t8
  "0x72382D2e24bbEB1F89DcCF4aB8F094a7b56f54e6", // battle t8
  "0x302Af8502FCa4123A715b91D3f913EAa240eFe49", // points t8
  "0x3FDF852F2E0a0c3E934Bd03A00392f657ceb9Bb0", // packs t8
].map((a) => a.toLowerCase());

// --- active surfaces to scan ------------------------------------------------
const TARGETS = [
  "webapp/lib",
  "webapp/app",
  "webapp/.env.local.example",
  "README.md",
];

const ALLOW_PATHS = [
  "canonical.ts", // the source itself
  "node_modules",
  ".next",
  "/dist/",
  ".git",
  "ADDRESSES.md", // address book keeps historical stacks (t8 testnet etc.)
  "selfmint/sim-", // mock-chain simulation artifacts (historical)
  "PLAN.md", // private tactical plan (gitignored)
];

const EXTS = new Set([
  ".ts", ".tsx", ".mjs", ".js", ".md", ".json", ".yaml", ".yml", ".txt", ".py", ".html", ".example",
]);

// Files that must carry or import the canonical core (full 40-hex form).
const MUST_CONTAIN_CORE = [
  "webapp/lib/contract.ts",
  "webapp/lib/poc-abis.ts",
];

function allowed(rel) {
  return ALLOW_PATHS.some((a) => rel.includes(a));
}

function walk(target, out) {
  const abs = join(ROOT, target);
  if (!existsSync(abs)) return;
  if (statSync(abs).isFile()) {
    out.push(target);
    return;
  }
  for (const name of readdirSync(abs)) {
    const rel = join(target, name);
    if (allowed(rel)) continue;
    const s = statSync(join(ROOT, rel));
    if (s.isDirectory()) walk(rel, out);
    else if (EXTS.has(extname(name))) out.push(rel);
  }
}

const ADDR = /0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g;

const files = [];
for (const t of TARGETS) walk(t, files);

const staleHits = [];
const otherHits = [];
for (const rel of files) {
  if (allowed(rel)) continue;
  const lines = readFileSync(join(ROOT, rel), "utf8").split(/\r?\n/);
  lines.forEach((ln, i) => {
    for (const m of ln.match(ADDR) || []) {
      const low = m.toLowerCase();
      if (STALE.includes(low)) staleHits.push(`${rel}:${i + 1}  ${m}`);
      else if (!CANON.has(low)) otherHits.push(`${rel}:${i + 1}  ${m}`);
    }
  });
}

const missingCore = [];
for (const rel of MUST_CONTAIN_CORE) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    missingCore.push(`${rel} (file missing)`);
    continue;
  }
  const src = readFileSync(p, "utf8");
  const hasLiteral = src.toLowerCase().includes(CANON_CORE.toLowerCase());
  const importsCanon = /from\s+["'](\.\.?\/)+canonical["']/.test(src);
  if (!hasLiteral && !importsCanon) missingCore.push(rel);
}

// --- report ----------------------------------------------------------------
console.log(`check-addresses: canonical set = ${CANON.size} address(es) from webapp/lib/canonical.ts`);

if (otherHits.length) {
  console.log(`\n[info] non-canonical 40-hex values (test vectors / wallet addrs — not contract refs):`);
  for (const h of otherHits) console.log(`  ${h}`);
}

if (missingCore.length) {
  console.log(`\n[FAIL] canonical core ${CANON_CORE} missing in:`);
  for (const m of missingCore) console.log(`  ${m}`);
}

if (staleHits.length) {
  console.log(`\n[FAIL] superseded contract address in active file:`);
  for (const h of staleHits) console.log(`  ${h}`);
}

if (staleHits.length || missingCore.length) {
  console.log(`\ncheck-addresses: FAIL (${staleHits.length} stale, ${missingCore.length} missing)`);
  process.exit(1);
}
console.log(`\ncheck-addresses: PASS (no stale addresses; canon present in all key files)`);
