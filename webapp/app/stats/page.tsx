import Link from "next/link";
import { getStatsSnapshot, STATS_DOMAIN, type StatsSnapshot } from "@/lib/stats";
import { SITE_URL } from "@/lib/site";
import { RH_CHAIN_ID } from "@/lib/contract";
import { CORE_ADDRESS } from "@/lib/poc";
import { explorerUrl } from "@/lib/rh-chain";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { IconDocs } from "../spirit/icons";

/**
 * /stats — server-rendered, citable collection statistics for Spirit Cards.
 */
export const dynamic = "force-dynamic";

const CURRENT_JSON = `${SITE_URL}/stats/current.json`;
const HISTORY_JSONL = `${SITE_URL}/stats/history.jsonl`;
const LICENSE_URL = "https://opensource.org/license/mit";

function buildDatasetJsonLd(snapshot: StatsSnapshot | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Spirit Cards — collection statistics",
    description:
      "Live stats for the Spirit Cards proof-of-work collectible-card collection " +
      `on Robinhood Chain (chainId ${RH_CHAIN_ID}): total minted, price, difficulty ` +
      "and merge fee, read directly from the on-chain contracts.",
    url: `${SITE_URL}/stats`,
    identifier: STATS_DOMAIN,
    creator: { "@type": "Organization", name: "Spirit Cards", url: SITE_URL },
    license: LICENSE_URL,
    isAccessibleForFree: true,
    keywords: ["proof of work", "PoW NFT", "Robinhood Chain", "NFT statistics", "Spirit Cards"],
    ...(snapshot ? { dateModified: snapshot.updatedAt } : {}),
    distribution: [
      { "@type": "DataDownload", name: "Current snapshot (JSON)", encodingFormat: "application/json", contentUrl: CURRENT_JSON },
      { "@type": "DataDownload", name: "Snapshot history (JSON Lines)", encodingFormat: "application/x-ndjson", contentUrl: HISTORY_JSONL },
    ],
  };
}

export default async function StatsPage() {
  let snapshot: StatsSnapshot | null = null;
  let error: string | null = null;

  try {
    snapshot = await getStatsSnapshot();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  const rows: Array<{ k: string; v: string }> = snapshot
    ? [
        { k: "Total minted", v: `${snapshot.totalMinted} / ${snapshot.maxSupply}` },
        { k: "Current price", v: snapshot.currentPriceEth === "0" ? "FREE" : `${snapshot.currentPriceEth} ETH` },
        { k: "Base difficulty", v: `${snapshot.baseBits} bits` },
        { k: "Mine cooldown", v: `${snapshot.mineCooldownSeconds}s` },
        { k: "Merge fee", v: `${snapshot.mergeFeeEth} ETH` },
        { k: "Burned", v: String(snapshot.burned) },
        { k: "Merged (forged)", v: String(snapshot.forged) },
        { k: "Mint paused", v: snapshot.paused ? "yes" : "no" },
        { k: "Chain", v: String(snapshot.chainId) },
        { k: "Contract", v: snapshot.contract },
      ]
    : [];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Stats 数据"
        title="Stats"
        image="/spirit/scene-elements.jpg"
        imageAlt="Spirit Cards collection statistics"
        icon={<IconDocs size={18} />}
        subtitle={
          <>
            Live, citable stats for Spirit Cards, read directly from the on-chain contracts.
            Machine-readable:{" "}
            <a href="/stats/current.json" className="font-code text-ember">
              /stats/current.json
            </a>{" "}
            and{" "}
            <a href="/stats/history.jsonl" className="font-code text-ember">
              /stats/history.jsonl
            </a>
            .
          </>
        }
      >
        <StatPill
          label="Minted"
          value={snapshot ? `${snapshot.totalMinted}/${snapshot.maxSupply}` : "—"}
        />
        <StatPill
          label="Price"
          value={snapshot ? (snapshot.currentPriceEth === "0" ? "FREE" : `${snapshot.currentPriceEth} ETH`) : "—"}
        />
      </PageHero>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildDatasetJsonLd(snapshot)) }}
      />

      {error && (
        <div className="mb-4 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
          Could not read stats: {error}
        </div>
      )}

      {snapshot && (
        <Panel kicker="On-chain Snapshot">
          <table className="w-full border-collapse font-code text-[12px]">
            <tbody>
              {rows.map((row) => (
                <tr key={row.k} className="border-b border-slate/40">
                  <td className="py-2 pr-4 text-ash">{row.k}</td>
                  <td className="break-all py-2 text-right text-bone">{row.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 break-all font-code text-[11px] text-ash">
            Updated {snapshot.updatedAt} · core{" "}
            <a
              href={explorerUrl(`address/${CORE_ADDRESS}`)}
              target="_blank"
              rel="noreferrer"
              className="text-ember"
            >
              {CORE_ADDRESS}
            </a>
          </p>
        </Panel>
      )}

      <p className="mt-6">
        <Link href="/docs/stats" className="btn-ghost px-5 py-2.5 text-xs">
          Dataset methodology ⟶
        </Link>
      </p>
    </main>
  );
}
