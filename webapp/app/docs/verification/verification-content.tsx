import Link from "next/link";
import type { CSSProperties } from "react";
import { RH_CHAIN_ID } from "@/lib/rh-chain";
import { CORE_ADDRESS, CONFIG_ADDRESS } from "@/lib/poc";
import type { Locale } from "@/lib/i18n";

const codeStyle: CSSProperties = {
  background: "var(--paper-blue)",
  border: "2px solid var(--ink)",
  borderRadius: 0,
  boxShadow: "4px 4px 0 rgba(17, 24, 43, 0.18)",
  padding: "12px 14px",
  overflowX: "auto",
  fontFamily: "var(--mono)",
  fontSize: 12.5,
  lineHeight: 1.55,
  color: "var(--ink)",
  margin: "10px 0 0",
  whiteSpace: "pre",
};

function Code({ children }: { children: string }) {
  return <pre style={codeStyle}>{children}</pre>;
}

const T = {
  en: {
    back: "← Docs",
    collection: "Collection",
    heading: "Verification (proof of work)",
    introBefore: "The exact keccak-256 proof-of-work rule of Spirit Cards. The core is ",
    introAfter:
      " and the tunable difficulty lives in the Config contract. Anyone can recompute a card's seed from its public on-chain values.",
    preimage: "Preimage",
    preimageIntro:
      "The miner grinds a 64-bit nonce until the keccak-256 hash of this 104-byte preimage has enough leading zero bits:",
    validity: "Validity rule",
    validityIntro:
      "A nonce is valid iff the number of leading zero bits of the work hash is at least Config.baseBits():",
    verify: "Verify without a transaction",
    verifyIntro:
      "Recompute workFor(miner, nonce) locally and compare its leading zero bits to baseBits(). On-chain, core.workFor(miner, nonce) returns the same hash.",
    contract: "Contract",
    config: "Config",
    chain: "Chain",
  },
  zh: {
    back: "← 文档",
    collection: "收藏",
    heading: "验证（工作量证明）",
    introBefore: "Spirit Cards 精确的 keccak-256 工作量证明规则。核心合约为 ",
    introAfter:
      "，可调的难度参数位于 Config 合约。任何人都能根据公开的链上数值重新计算卡牌种子。",
    preimage: "原像",
    preimageIntro:
      "矿工不断尝试 64 位 nonce，直到该 104 字节原像的 keccak-256 哈希具有足够的前导零位：",
    validity: "有效性规则",
    validityIntro: "当 work 哈希的前导零位数不少于 Config.baseBits() 时，该 nonce 有效：",
    verify: "无需交易的验证",
    verifyIntro:
      "在本地重新计算 workFor(miner, nonce) 并比较其前导零位与 baseBits()。链上 core.workFor(miner, nonce) 返回相同哈希。",
    contract: "核心合约",
    config: "配置合约",
    chain: "链",
  },
} as const;

export function VerificationContent({ locale }: { locale: Locale }) {
  const t = T[locale];

  return (
    <main className="container">
      <p className="small">
        <Link href="/docs">{t.back}</Link> · <Link href="/collection">{t.collection}</Link>
      </p>
      <h1>{t.heading}</h1>
      <p className="muted">
        {t.introBefore}
        <span className="mono">{CORE_ADDRESS}</span>
        {t.introAfter}
      </p>

      <div className="panel">
        <h2>{t.preimage}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {t.preimageIntro}
        </p>
        <Code>{`work = keccak256(abi.encodePacked(
    uint256 chainId,   // 32 bytes, big-endian
    address core,      // 20 bytes
    address miner,     // 20 bytes
    uint256 nonce      // 32 bytes, big-endian
))
// 32 + 20 + 20 + 32 = 104 bytes (one Keccak-256 rate block)
// chainId = ${RH_CHAIN_ID}`}</Code>
      </div>

      <div className="panel">
        <h2>{t.validity}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {t.validityIntro}
        </p>
        <Code>{`valid  <=>  leadingZeroBits(work) >= Config.baseBits()

// Expected attempts ~= 2^baseBits
// Nonces are single-use per wallet (nonceUsed[miner][nonce])`}</Code>
      </div>

      <div className="panel">
        <h2>{t.verify}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {t.verifyIntro}
        </p>
        <Code>{`recompute  work = keccak256(chainId, core, miner, nonce)
compare    leadingZeroBits(work) >= Config.baseBits()`}</Code>
        <div style={{ marginTop: 12 }}>
          <div className="row">
            <span className="k">{t.contract}</span>
            <span className="v mono">{CORE_ADDRESS}</span>
          </div>
          <div className="row">
            <span className="k">{t.config}</span>
            <span className="v mono">{CONFIG_ADDRESS}</span>
          </div>
          <div className="row">
            <span className="k">{t.chain}</span>
            <span className="v mono">{RH_CHAIN_ID}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
