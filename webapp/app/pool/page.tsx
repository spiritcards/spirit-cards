"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { IconStake } from "../spirit/icons";

/**
 * /pool — read-only pool / emissions ops dashboard.
 *
 * Renders the live revenue buckets, the split config and the staking vault
 * accounting fetched from /api/pool. All figures are read-only; the pool is
 * paid out to stakers by running the keeper script off-chain.
 */

type PoolData = {
  domain: string;
  updatedAt: string;
  addresses: { core: string; config: string; vault: string };
  revenue: {
    accruedPool: string;
    accruedHouse: string;
    accruedReserve: string;
    referralOutstanding: string;
  };
  supply: { totalMinted: string; burned: string; forged: string };
  config: {
    maxSupply: string;
    paused: boolean;
    poolBps: string;
    referralBps: string;
    houseBps: string;
    reserveBps: string;
    pvpRakeBps: string;
  };
  staking: {
    totalWeight: string;
    undistributed: string;
    accRewardPerWeight: string;
  };
};

/** Native-token amount (18 decimals) → human string, 4 dp. Falls back to raw. */
function eth(v: string): string {
  try {
    const n = Number(formatEther(BigInt(v)));
    if (!Number.isFinite(n)) return v;
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return v;
  }
}

/** Basis points → percent string (e.g. 2500 → "25.00%"). */
function pct(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return `${(n / 100).toFixed(2)}%`;
}

/** True when a decimal string parses to a non-zero bigint. */
function gtZero(v: string): boolean {
  try {
    return BigInt(v) > 0n;
  } catch {
    return false;
  }
}

export default function PoolPage() {
  const [data, setData] = useState<PoolData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pool", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as PoolData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load pool snapshot");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const poolPending = data ? gtZero(data.revenue.accruedPool) : false;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Pool 奖池"
        title="Pool"
        image="/spirit/scene-dragon.jpg"
        imageAlt="Spirit Cards staking dividends pool"
        icon={<IconStake size={18} />}
        subtitle="Staking dividends pool — how Spirit Cards protocol revenue is split between stakers, house, reserve and referrals, read live from the on-chain contracts."
      >
        <StatPill label="Pool accrued" value={data ? eth(data.revenue.accruedPool) : "—"} />
        <StatPill
          label="Undistributed"
          value={data ? eth(data.staking.undistributed) : "—"}
        />
        <StatPill
          label="Minted"
          value={data ? `${data.supply.totalMinted}/${data.config.maxSupply}` : "—"}
        />
      </PageHero>

      {error && (
        <div className="mb-4 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
          Could not load pool snapshot: {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {poolPending && (
            <div className="border border-ember/50 bg-ember/10 px-4 py-3 font-code text-[11px] leading-relaxed text-bone">
              accruedPool &gt; 0 — run the keeper to pay stakers:{" "}
              <span className="text-ember">contracts/script/PumpPool.s.sol</span>{" "}
              (withdrawPool → StakeVault.notifyRewards).
            </div>
          )}

          <Panel kicker="Revenue Buckets">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  Pool (stakers)
                </p>
                <p className="mt-1 font-code text-xl font-bold text-gold">
                  {eth(data.revenue.accruedPool)}
                </p>
                <p className="mt-1 break-all font-code text-[10px] text-ash/70">
                  {data.revenue.accruedPool}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">House</p>
                <p className="mt-1 font-code text-xl font-bold text-gold">
                  {eth(data.revenue.accruedHouse)}
                </p>
                <p className="mt-1 break-all font-code text-[10px] text-ash/70">
                  {data.revenue.accruedHouse}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">Reserve</p>
                <p className="mt-1 font-code text-xl font-bold text-gold">
                  {eth(data.revenue.accruedReserve)}
                </p>
                <p className="mt-1 break-all font-code text-[10px] text-ash/70">
                  {data.revenue.accruedReserve}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  Referral outstanding
                </p>
                <p className="mt-1 font-code text-xl font-bold text-gold">
                  {eth(data.revenue.referralOutstanding)}
                </p>
                <p className="mt-1 break-all font-code text-[10px] text-ash/70">
                  {data.revenue.referralOutstanding}
                </p>
              </div>
            </div>

            <table className="mt-5 w-full border-collapse font-code text-[12px]">
              <thead>
                <tr className="border-b border-slate text-left text-[10px] uppercase tracking-[0.14em] text-ash">
                  <th className="py-2 pr-4 font-normal">Split</th>
                  <th className="py-2 pr-4 font-normal">Bps</th>
                  <th className="py-2 text-right font-normal">Share</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate/40">
                  <td className="py-2 pr-4 text-ash">Pool</td>
                  <td className="py-2 pr-4 text-bone">{data.config.poolBps}</td>
                  <td className="py-2 text-right text-gold">{pct(data.config.poolBps)}</td>
                </tr>
                <tr className="border-b border-slate/40">
                  <td className="py-2 pr-4 text-ash">Referral</td>
                  <td className="py-2 pr-4 text-bone">{data.config.referralBps}</td>
                  <td className="py-2 text-right text-gold">{pct(data.config.referralBps)}</td>
                </tr>
                <tr className="border-b border-slate/40">
                  <td className="py-2 pr-4 text-ash">House</td>
                  <td className="py-2 pr-4 text-bone">{data.config.houseBps}</td>
                  <td className="py-2 text-right text-gold">{pct(data.config.houseBps)}</td>
                </tr>
                <tr className="border-b border-slate/40">
                  <td className="py-2 pr-4 text-ash">Reserve</td>
                  <td className="py-2 pr-4 text-bone">{data.config.reserveBps}</td>
                  <td className="py-2 text-right text-gold">{pct(data.config.reserveBps)}</td>
                </tr>
                <tr className="border-b border-slate/40">
                  <td className="py-2 pr-4 text-ash">PvP rake</td>
                  <td className="py-2 pr-4 text-bone">{data.config.pvpRakeBps}</td>
                  <td className="py-2 text-right text-gold">{pct(data.config.pvpRakeBps)}</td>
                </tr>
              </tbody>
            </table>
          </Panel>

          <Panel kicker="Staking">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  Total weight
                </p>
                <p className="mt-1 break-all font-code text-lg font-bold text-bone">
                  {data.staking.totalWeight}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  Undistributed
                </p>
                <p className="mt-1 font-code text-lg font-bold text-gold">
                  {eth(data.staking.undistributed)}
                </p>
                <p className="mt-1 break-all font-code text-[10px] text-ash/70">
                  {data.staking.undistributed}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  accRewardPerWeight
                </p>
                <p className="mt-1 break-all font-code text-[11px] text-bone">
                  {data.staking.accRewardPerWeight}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  Minted / max supply
                </p>
                <p className="mt-1 font-code text-lg font-bold text-bone">
                  {data.supply.totalMinted} / {data.config.maxSupply}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  Burned / forged
                </p>
                <p className="mt-1 font-code text-lg font-bold text-bone">
                  {data.supply.burned} / {data.supply.forged}
                </p>
              </div>
              <div className="border border-slate/60 bg-obsidian/40 px-4 py-3">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                  Mint paused
                </p>
                <p className="mt-2">
                  <span
                    className={`inline-block border px-2 py-[2px] font-code text-[10px] uppercase tracking-[0.14em] ${
                      data.config.paused
                        ? "border-magma/50 text-magma"
                        : "border-moss/50 text-moss"
                    }`}
                  >
                    {data.config.paused ? "yes" : "no"}
                  </span>
                </p>
              </div>
            </div>

            <p className="mt-5 break-all font-code text-[11px] text-ash">
              Updated {data.updatedAt} · core{" "}
              <span className="text-bone/80">{data.addresses.core}</span> · vault{" "}
              <span className="text-bone/80">{data.addresses.vault}</span>
            </p>
          </Panel>
        </div>
      )}

      {!data && !error && (
        <div className="border border-slate bg-obsidian/50 px-4 py-3 font-code text-[11px] text-ash">
          {loading ? "Loading…" : "No data yet."}
        </div>
      )}

      <p className="mt-6 max-w-3xl break-all font-code text-[11px] leading-relaxed text-ash">
        The pool bucket is paid to stakers by running the keeper script{" "}
        <span className="text-bone/80">contracts/script/PumpPool.s.sol</span>{" "}
        (withdrawPool → StakeVault.notifyRewards). This page never writes on-chain.
      </p>

      <div className="mt-4">
        <button
          className="btn-ghost px-5 py-2.5 text-xs disabled:opacity-40"
          onClick={() => load()}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
    </main>
  );
}
