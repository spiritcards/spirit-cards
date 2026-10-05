"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { shortAddress } from "@/lib/format";
import { humanizeRpcError } from "@/lib/rpc";
import { useEthWallet } from "@/lib/useEthWallet";
import type { WalletPoints } from "@/lib/points";
import type { AgentRecord } from "@/lib/agents";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { IconPoints } from "../spirit/icons";

type Board = {
  computedAtBlock: number;
  totals: { wallets: number; points: number };
  wallets: WalletPoints[];
  agents?: AgentRecord[];
  rules?: { mine: number; merge: number; stake: number; pvpWin: number };
};

export default function PointsPage() {
  const wallet = useEthWallet();
  const { address } = wallet;

  const [board, setBoard] = useState<Board | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/points", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBoard((await res.json()) as Board);
      setBoardError(null);
    } catch (e) {
      setBoardError(humanizeRpcError(e instanceof Error ? e.message : "Could not load points"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async (who: Address) => {
    try {
      const res = await fetch(`/api/points?address=${who}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { wallet?: WalletPoints };
      setMyPoints(data.wallet?.points ?? 0);
    } catch {
      setMyPoints(null);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (address) void loadMine(address);
    else setMyPoints(null);
  }, [address, loadMine]);

  const rules = board?.rules ?? { mine: 0, merge: 0, stake: 0, pvpWin: 0 };

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Points 积分"
        title="Points"
        image="/spirit/scene-dragon.jpg"
        imageAlt="Points — an elemental dragon rising through a hex portal"
        icon={<IconPoints size={18} />}
        subtitle="Points are accrued by using the collection — mining, merging, staking and winning duels. Per-wallet totals are read from the on-chain Points contract; the leaderboard is a best-effort aggregation of the PointsAdded log."
      >
        <StatPill label="Your points" value={myPoints === null ? "…" : String(myPoints)} />
        <StatPill label="Wallets" value={board ? String(board.totals.wallets) : "…"} />
        <StatPill label="Total pts" value={board ? String(board.totals.points) : "…"} />
      </PageHero>

      {boardError && (
        <div className="mb-4 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
          Could not load points: {boardError}
        </div>
      )}

      <div className="space-y-4">
        <Panel kicker="Your Wallet">
          <div className="flex items-center justify-between gap-4 border-b border-slate/60 pb-3 font-code text-[12px]">
            <span className="uppercase tracking-[0.14em] text-ash">Wallet</span>
            <span className="text-right text-bone">
              {address ? (
                <>
                  {shortAddress(address)}{" "}
                  <span
                    className={`ml-1 inline-block border px-2 py-[2px] font-code text-[10px] uppercase tracking-[0.14em] ${
                      !wallet.wrongChain ? "border-moss/50 text-moss" : "border-magma/50 text-magma"
                    }`}
                  >
                    chain {wallet.chainId ?? "?"}
                  </span>
                </>
              ) : (
                "not connected"
              )}
            </span>
          </div>

          {address && (
            <div className="mt-5 inline-block border border-gold/40 bg-gold/10 px-5 py-4">
              <div className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">Your points</div>
              <div className="mt-1 font-code text-4xl font-bold text-gold">
                {myPoints === null ? "…" : myPoints}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!address ? (
              <>
                <button
                  className={`${wallet.hasInjected ? "btn-ember" : "btn-ghost"} px-5 py-2.5 text-xs`}
                  onClick={() => wallet.connect().catch((e) => setError(e.message))}
                >
                  Connect wallet
                </button>
                <button
                  className={`${wallet.hasInjected ? "btn-ghost" : "btn-ember"} px-5 py-2.5 text-xs disabled:opacity-40`}
                  onClick={() => wallet.connectWalletConnect().catch((e) => setError(e.message))}
                  disabled={!wallet.wcEnabled}
                >
                  WalletConnect (QR)
                </button>
              </>
            ) : (
              <button
                className="btn-ghost px-4 py-2 text-xs disabled:opacity-40"
                onClick={() => loadBoard()}
                disabled={loading}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-5 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
              {error}
            </div>
          )}
        </Panel>

        <Panel kicker="How Points Are Earned">
          <table className="w-full border-collapse font-code text-[12px]">
            <thead>
              <tr className="border-b border-slate text-left text-[10px] uppercase tracking-[0.14em] text-ash">
                <th className="py-2 pr-4 font-normal">Action</th>
                <th className="py-2 text-right font-normal">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate/40">
                <td className="py-2 pr-4 text-ash">Mine a card</td>
                <td className="py-2 text-right text-gold">+{rules.mine}</td>
              </tr>
              <tr className="border-b border-slate/40">
                <td className="py-2 pr-4 text-ash">Merge (forge)</td>
                <td className="py-2 text-right text-gold">+{rules.merge}</td>
              </tr>
              <tr className="border-b border-slate/40">
                <td className="py-2 pr-4 text-ash">Stake a card</td>
                <td className="py-2 text-right text-gold">+{rules.stake}</td>
              </tr>
              <tr className="border-b border-slate/40">
                <td className="py-2 pr-4 text-ash">Win a duel</td>
                <td className="py-2 text-right text-gold">+{rules.pvpWin}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel kicker="Leaderboard">
          {board === null ? (
            <div className="border border-slate bg-obsidian/50 px-4 py-3 font-code text-[11px] text-ash">
              {loading ? "Loading…" : "No data yet."}
            </div>
          ) : board.wallets.length === 0 ? (
            <div className="border border-slate bg-obsidian/50 px-4 py-3 font-code text-[11px] text-ash">
              No activity yet — mine the first card to appear here.
            </div>
          ) : (
            <>
              <p className="font-code text-[11px] uppercase tracking-[0.12em] text-ash">
                {board.totals.wallets} wallets · {board.totals.points} points · computed at block{" "}
                <span className="text-bone">{board.computedAtBlock}</span>
              </p>
              <table className="mt-4 w-full border-collapse font-code text-[12px]">
                <thead>
                  <tr className="border-b border-slate text-left text-[10px] uppercase tracking-[0.14em] text-ash">
                    <th className="py-2 pr-4 font-normal">#</th>
                    <th className="py-2 pr-4 font-normal">Wallet</th>
                    <th className="py-2 text-right font-normal">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {board.wallets.slice(0, 50).map((w, i) => (
                    <tr key={w.address} className="border-b border-slate/40">
                      <td className="py-2 pr-4 text-ash">{i + 1}</td>
                      <td className="py-2 pr-4 text-bone">
                        {shortAddress(w.address)}
                        {w.name ? <span className="ml-2 text-ash">{w.name}</span> : null}
                        {w.agent ? (
                          <span className="ml-2 inline-block border border-moss/50 px-2 py-[1px] font-code text-[9px] uppercase tracking-[0.14em] text-moss">
                            agent
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right text-gold">{w.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Panel>

        {board?.agents && board.agents.length > 0 && (
          <Panel kicker="Agent Registry">
            <ul className="space-y-3">
              {board.agents.map((agent) => (
                <li
                  key={agent.address}
                  className="border-b border-slate/40 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2 font-code text-[12px]">
                    <span className="text-bone">{agent.name}</span>
                    <span className="inline-block border border-moss/50 px-2 py-[1px] text-[9px] uppercase tracking-[0.14em] text-moss">
                      agent
                    </span>
                    <span className="text-ash">{shortAddress(agent.address)}</span>
                  </div>
                  {agent.description ? (
                    <p className="mt-1.5 mb-0 text-[12px] leading-relaxed text-ash">
                      {agent.description}
                    </p>
                  ) : null}
                  {agent.links && agent.links.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-3 font-code text-[11px]">
                      {agent.links.map((link) => (
                        <a
                          key={`${agent.address}:${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ember hover:underline"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </main>
  );
}
