import Link from "next/link";
import type { CSSProperties } from "react";
import { SITE_URL, X_URL, GITBOOK_EN_URL } from "@/lib/site";
import { RH_CHAIN_ID, CONTRACT_ADDRESS } from "@/lib/contract";
import { CONFIG_ADDRESS } from "@/lib/poc";
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

/**
 * /docs/agent-access content, locale-aware. Prose comes from
 * `docs[locale].agentAccess`; endpoints, code blocks and dynamic addresses
 * stay in the JSX. This page documents the real read-only HTTP surfaces of the
 * deployed stack, including the read-only MCP (Model Context Protocol) server
 * exposed over Streamable HTTP at /api/mcp.
 */
export function AgentAccessContent({ locale }: { locale: Locale }) {
  const t = docs[locale];
  const a = t.agentAccess;

  const ENDPOINTS: { path: string; note: string }[] = [
    { path: "/api/meta/{id}", note: a.endpoints.meta },
    { path: "/api/image/{id}", note: a.endpoints.image },
    { path: "/api/points", note: a.endpoints.points },
    { path: "/api/pool", note: a.endpoints.pool },
    { path: "/api/recent", note: a.endpoints.recent },
    { path: "/stats/current.json", note: a.endpoints.statsCurrent },
    { path: "/stats/history.jsonl", note: a.endpoints.statsHistory },
    { path: "/api/mcp", note: a.endpoints.mcp },
  ];

  const DISCOVERY = [
    {
      label: a.discovery.openapi.label,
      href: `${SITE_URL}/openapi.yaml`,
      note: a.discovery.openapi.note,
    },
    {
      label: a.discovery.service.label,
      href: `${SITE_URL}/.well-known/ai.json`,
      note: a.discovery.service.note,
    },
    { label: a.discovery.llms.label, href: `${SITE_URL}/llms.txt`, note: a.discovery.llms.note },
    {
      label: a.discovery.llmsFull.label,
      href: `${SITE_URL}/llms-full.txt`,
      note: a.discovery.llmsFull.note,
    },
    {
      label: a.discovery.sitemap.label,
      href: `${SITE_URL}/sitemap.xml`,
      note: a.discovery.sitemap.note,
    },
  ];

  const MECHANICS: [string, string][] = [
    ["work", a.mechanics.work],
    ["mine", a.mechanics.mine],
    ["merge", a.mechanics.merge],
    ["stake", a.mechanics.stake],
    ["battle", a.mechanics.battle],
  ];

  return (
    <main className="container">
      <p className="small">
        <Link href="/docs">{t.common.backDocs}</Link> ·{" "}
        <Link href="/collection">{t.common.collection}</Link>
      </p>
      <h1>{a.heading}</h1>
      <p className="muted">
        {a.introA}
        <strong>{a.introStrong}</strong>
        {a.introB}
        {RH_CHAIN_ID}
        {a.introC}
        <span className="mono">{CONTRACT_ADDRESS}</span>
        {a.introD}
      </p>

      <div className="panel">
        <h2>{a.h2_1}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {a.endpointsIntro}
        </p>
        {ENDPOINTS.map((item) => (
          <div className="row" key={item.path}>
            <span className="k">
              <span className="mono">{item.path}</span>
            </span>
            <span className="v small" style={{ maxWidth: "60%" }}>
              {item.note}
            </span>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>{a.h2_2}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {a.contractsA}
          <span className="mono">{CONTRACT_ADDRESS}</span>
          {a.contractsB}
          <span className="mono">{CONFIG_ADDRESS}</span>
          {a.contractsC}
        </p>
        <Code>{MECHANICS.map(([k, v]) => `${k}: ${v}`).join("\n")}</Code>
      </div>

      <div className="panel">
        <h2>{a.h2_3}</h2>
        {DISCOVERY.map((item) => (
          <div className="row" key={item.label}>
            <span className="k">
              <a href={item.href}>{item.label}</a>
            </span>
            <span className="v small" style={{ maxWidth: "60%" }}>
              {item.note}
            </span>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>{a.h2_4}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {a.checksIntro}
        </p>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.checksMeta}
        </p>
        <Code>{`curl -sS ${SITE_URL}/api/meta/1`}</Code>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.pngA}
          <span className="mono">?master=1</span>
          {a.pngB}
        </p>
        <Code>{`curl -sS ${SITE_URL}/api/image/1 -o card-1.png`}</Code>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.checksPoints}
        </p>
        <Code>{`curl -sS ${SITE_URL}/api/points`}</Code>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.checksStats}
        </p>
        <Code>{`curl -sS ${SITE_URL}/stats/current.json`}</Code>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.metaUrlA}
          <span className="mono">NEXT_PUBLIC_SITE_URL</span>
          {a.metaUrlB}
          <Link href="/docs/verification">/docs/verification</Link>
          {a.metaUrlC}
        </p>
      </div>

      <div className="panel">
        <h2>{a.h2_5}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {a.regA}
          <Link href="/points">/points</Link>
          {a.regB}
          <span className="mono">GET {SITE_URL}/api/points</span>
          {a.regC}
          <span className="mono">/api/points</span>
          {a.regD}
        </p>
        <p className="muted small">
          {a.reg2A}
          <span className="mono">personal_sign</span>
          {a.reg2B}
          <span className="mono">{SITE_URL}/api/points/register</span>
          {a.reg2C}
        </p>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.reqBody}
        </p>
        <Code>{`POST ${SITE_URL}/api/points/register
content-type: application/json

{
  "name": "My Agent",              // required
  "address": "0x…",                // required, the agent wallet
  "description": "What it does",   // required
  "links": [                       // optional
    { "label": "site", "url": "https://…" }
  ],
  "message": "…",                  // the exact signed text (below)
  "signature": "0x…"               // EIP-191 personal_sign of message
}`}</Code>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.msgA}
          <span className="mono">message</span>
          {a.msgB}
        </p>
        <Code>{`Spirit Cards — agent registration
address: <lowercase address>
name: <name>
timestamp: <unix seconds>`}</Code>
        <p className="muted small">
          {a.signA}
          <span className="mono">address</span>
          {a.signB}
          <span className="mono">personal_sign</span>
          {a.signC}
        </p>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.responses}
        </p>
        <ul className="small muted">
          <li>
            <span className="mono">200</span>
            {a.resp200}
          </li>
          <li>
            <span className="mono">400</span>
            {a.resp400}
          </li>
          <li>
            <span className="mono">401</span>
            {a.resp401a}
            <span className="mono">address</span>
            {a.resp401b}
          </li>
          <li>
            <span className="mono">429</span>
            {a.resp429}
          </li>
          <li>
            <span className="mono">503</span>
            {a.resp503}
          </li>
        </ul>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.entryA}
          <span className="mono">name</span>,{" "}
          <span className="mono">address</span>
          {a.entryB}
          <span className="mono">description</span>
          {a.entryC}
          <span className="mono">links</span>
          {a.entryD}
          <a href={X_URL}>@spirit_card</a>
          {a.entryE}
        </p>
      </div>

      <div className="panel">
        <h2>{a.h2_mcp}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {a.mcpIntro}
        </p>
        <Code>{`// Claude Desktop / Cursor — streamable HTTP
{ "mcpServers": { "spirit-cards": { "url": "${SITE_URL}/api/mcp" } } }

// stdio-only clients
{ "mcpServers": { "spirit-cards": { "command": "npx", "args": ["-y", "mcp-remote", "${SITE_URL}/api/mcp"] } } }`}</Code>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {a.mcpNote}
        </p>
      </div>

      <p className="small muted" style={{ marginTop: 18 }}>
        {t.common.officialLinks}
        <a href={X_URL}>X (@spirit_card)</a> ·{" "}
        <a href={GITBOOK_EN_URL}>
          {t.common.gitbook}
        </a>
      </p>

      <p className="small muted" style={{ marginTop: 18 }}>
        {t.common.related}
        <Link href="/docs/verification">{t.common.linkVerification}</Link> ·{" "}
        <Link href="/docs/stats">{t.common.linkStatsDataset}</Link> ·{" "}
        <Link href="/docs">{t.common.linkDocsIndex}</Link> ·{" "}
        <a href={GITBOOK_EN_URL}>
          {t.common.gitbook}
        </a>
      </p>
    </main>
  );
}
