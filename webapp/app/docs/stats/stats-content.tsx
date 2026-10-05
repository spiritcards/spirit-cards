import Link from "next/link";
import type { CSSProperties } from "react";
import { SITE_URL } from "@/lib/site";
import { RH_CHAIN_ID, CONTRACT_ADDRESS } from "@/lib/contract";
import { CORE_ADDRESS } from "@/lib/poc";
import { docs } from "@/lib/i18n";
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

type Field = {
  key: string;
  type: string;
  units: string;
};

function FieldTable({ fields, locale }: { fields: Field[]; locale: Locale }) {
  const t = docs[locale].stats;
  return (
    <table className="tier-table" style={{ marginTop: 12 }}>
      <thead>
        <tr>
          <th>{t.thField}</th>
          <th>{t.thType}</th>
          <th>{t.thUnitsMeaning}</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={field.key}>
            <td className="mono">{field.key}</td>
            <td className="mono small">{field.type}</td>
            <td className="small muted">{field.units}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * /docs/stats content, locale-aware. Prose comes from `docs[locale].stats`;
 * schema field names, JSON keys, endpoints and numeric examples stay in JSX.
 */
export function StatsContent({ locale }: { locale: Locale }) {
  const t = docs[locale];
  const s = t.stats;
  const c = s.current;
  const h = s.history;
  const e = s.endpoints;

  const ENDPOINTS = [
    { label: "/stats", href: `${SITE_URL}/stats`, note: e.stats },
    {
      label: "/stats/current.json",
      href: `${SITE_URL}/stats/current.json`,
      note: e.current,
    },
    {
      label: "/stats/history.jsonl",
      href: `${SITE_URL}/stats/history.jsonl`,
      note: e.history,
    },
  ];

  const CURRENT_FIELDS: Field[] = [
    { key: "domain", type: "string", units: c.domain },
    { key: "updatedAt", type: "string", units: c.updatedAt },
    { key: "chainId", type: "integer", units: `${RH_CHAIN_ID}` },
    { key: "contract", type: "string", units: c.contract },
    { key: "site", type: "string", units: c.site },
    { key: "totalMinted", type: "integer", units: c.totalMinted },
    { key: "maxSupply", type: "integer", units: c.maxSupply },
    { key: "currentPriceEth", type: "string", units: c.currentPriceEth },
    { key: "baseBits", type: "integer", units: c.baseBits },
    {
      key: "mineCooldownSeconds",
      type: "integer",
      units: c.mineCooldownSeconds,
    },
    { key: "mergeFeeEth", type: "string", units: c.mergeFeeEth },
    { key: "burned", type: "integer", units: c.burned },
    { key: "forged", type: "integer", units: c.forged },
    { key: "paused", type: "boolean", units: c.paused },
  ];

  const HISTORY_FIELDS: Field[] = [
    { key: "ts", type: "string", units: h.ts },
    { key: "totalMinted", type: "integer", units: h.totalMinted },
    { key: "currentPriceEth", type: "string", units: h.currentPriceEth },
    { key: "baseBits", type: "integer", units: h.baseBits },
  ];

  return (
    <main className="container">
      <p className="small">
        <Link href="/docs">{t.common.backDocs}</Link> ·{" "}
        <Link href="/collection">{t.common.collection}</Link>
      </p>
      <h1>{s.heading}</h1>
      <p className="muted">
        {s.introBefore}
        <span className="mono">{CONTRACT_ADDRESS}</span>
        {s.introAfter}
      </p>

      <div className="panel">
        <h2>{s.h2_1}</h2>
        {ENDPOINTS.map((item) => (
          <div className="row" key={item.label}>
            <span className="k">
              <a href={item.href} className="mono">
                {item.label}
              </a>
            </span>
            <span className="v small" style={{ maxWidth: "60%" }}>
              {item.note}
            </span>
          </div>
        ))}
        <p className="muted small" style={{ marginBottom: 0 }}>
          {s.endpointsNoteA}
          <span className="mono">/stats</span>
          {s.endpointsNoteB}
          <span className="mono">schema.org/Dataset</span>
          {s.endpointsNoteC}
        </p>
      </div>

      <div className="panel">
        <h2>{s.h2_2}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {s.currentIntro}
        </p>
        <Code>{`{
  "domain": "spiritcards.fun/stats/1",
  "updatedAt": "2026-09-16T21:08:56.181Z",
  "chainId": ${RH_CHAIN_ID},
  "contract": "${CORE_ADDRESS}",
  "site": "${SITE_URL}",
  "totalMinted": 1,
  "maxSupply": 8888,
  "currentPriceEth": "0.00037",
  "baseBits": 20,
  "mineCooldownSeconds": 45,
  "mergeFeeEth": "0.00002",
  "burned": 0,
  "forged": 0,
  "paused": false
}`}</Code>
        <FieldTable fields={CURRENT_FIELDS} locale={locale} />
        <p className="muted small">
          {s.unitsLineA}
          <span className="mono">uint256</span>
          {s.unitsLineB}
          <span className="mono">currentPriceEth</span>
          {s.unitsLineC}
          <span className="mono">mergeFeeEth</span>
          {s.unitsLineD}
          <span className="mono">baseBits</span>
          {s.unitsLineE}
        </p>
      </div>

      <div className="panel">
        <h2>{s.h2_3}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {s.histA}
          <span className="mono">current.json</span>
          {s.histB}
          <span className="mono">ts</span>
          {s.histC}
          <span className="mono">updatedAt</span>
          {s.histD}
        </p>
        <Code>{`{"ts":"2026-09-16T17:00:00.000Z","totalMinted":1,"currentPriceEth":"0.00037","baseBits":20}
{"ts":"2026-09-16T19:00:00.000Z","totalMinted":1,"currentPriceEth":"0.00037","baseBits":20}
{"ts":"2026-09-16T21:08:56.181Z","totalMinted":1,"currentPriceEth":"0.00037","baseBits":20}`}</Code>
        <FieldTable fields={HISTORY_FIELDS} locale={locale} />
        <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
          <li>{s.histLi1}</li>
          <li>{s.histLi2}</li>
          <li>{s.histLi3}</li>
        </ul>
      </div>

      <div className="panel">
        <h2>{s.h2_4}</h2>
        <ul className="small" style={{ marginTop: 0, paddingLeft: 20 }}>
          <li>
            <strong>{s.methodSourceLabel}</strong>
            {s.methodSourceA}
            <span className="mono">eth_call</span>
            {s.methodSourceB}
          </li>
          <li>
            <strong>{s.methodReadsLabel}</strong>
            {s.methodReadsA}
            <span className="mono">
              totalMinted, maxSupply, currentPrice, baseBits, mineCooldown,
              mergeFee, paused
            </span>
            {s.methodReadsB}
            <span className="mono">burned()</span>
            {s.methodReadsC}
            <span className="mono">forged()</span>
            {s.methodReadsD}
          </li>
          <li>
            <strong>{s.methodCacheLabel}</strong>
            {s.methodCacheA}
            <span className="mono">current.json</span>
            {s.methodCacheB}
            <span className="mono">s-maxage=60, stale-while-revalidate=300</span>
            {s.methodCacheC}
            <span className="mono">updatedAt</span>
            {s.methodCacheD}
            <span className="mono">updatedAt</span>
            {s.methodCacheE}
          </li>
          <li>
            <strong>{s.methodHistoryLabel}</strong>
            {s.methodHistoryA}
            <span className="mono">history.jsonl</span>
            {s.methodHistoryB}
            <span className="mono">current.json</span>
            {s.methodHistoryC}
          </li>
          <li>
            <strong>{s.methodDetLabel}</strong>
            {s.methodDetA}
            <Link href="/docs/verification">/docs/verification</Link>.
          </li>
        </ul>
      </div>

      <div className="panel">
        <h2>{s.h2_5}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {s.citeA}
          <span className="mono">updatedAt</span>
          {s.citeB}
        </p>
        <Code>{`Spirit Cards stats — chainId ${RH_CHAIN_ID}, contract ${CORE_ADDRESS},
dataset spiritcards.fun/stats/1, ${SITE_URL}/stats/current.json, updatedAt <ISO-8601 UTC>.`}</Code>
        <ul className="small" style={{ margin: "10px 0 0", paddingLeft: 20 }}>
          <li>
            {s.citeDiffA}
            <span className="mono">baseBits</span>
            {s.citeDiffB}
            <span className="mono">currentRequiredBits</span>
            {s.citeDiffC}
            <strong>{s.citeBitsWord}</strong>
            {s.citeDiffD}
          </li>
          <li>
            {s.citePriceA}
            <span className="mono">currentPriceEth</span>
            {s.citePriceB}
          </li>
          <li>
            {s.citeSupplyA}
            <span className="mono">totalMinted</span>
            {s.citeSupplyB}
            <span className="mono">maxSupply</span>
            {s.citeSupplyC}
            <span className="mono">burned</span>
            {s.citeSupplyD}
            <span className="mono">forged</span>
            {s.citeSupplyE}
          </li>
        </ul>
      </div>

      <div className="panel">
        <h2>{s.h2_6}</h2>
        <ul className="small" style={{ marginTop: 0, paddingLeft: 20 }}>
          <li>
            <span className="mono">current.json</span>
            {s.cadenceCurA}
          </li>
          <li>
            <span className="mono">history.jsonl</span>
            {s.cadenceHistA}
          </li>
          <li>
            <strong>{s.cadenceVerLabel}</strong>
            {s.cadenceVerA}
            <span className="mono">domain</span>
            {s.cadenceVerB}
            <span className="mono">spiritcards.fun/stats/1</span>
            {s.cadenceVerC}
          </li>
        </ul>
      </div>

      <p className="small muted" style={{ marginTop: 18 }}>
        {t.common.related}
        <Link href="/docs/agent-access">{t.common.linkAgentAccess}</Link> ·{" "}
        <Link href="/docs/verification">{t.common.linkVerification}</Link> ·{" "}
        <Link href="/stats">{t.common.linkLiveStats}</Link> ·{" "}
        <Link href="/docs">{t.common.linkDocsIndex}</Link> ·{" "}
        <a href="https://spiritcards.fun/docs">
          {t.common.gitbook}
        </a>
      </p>
    </main>
  );
}
