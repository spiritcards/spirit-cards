"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { rhChain, RH_RPC_URL, explorerUrl } from "@/lib/rh-chain";
import { rpcFetch } from "@/lib/rpc";
import {
  CORE_ADDRESS,
  VAULT_ADDRESS,
  PROOF_OF_CARD_ABI,
  STAKE_VAULT_ABI,
} from "@/lib/poc";
import { CANON_FROM_BLOCK } from "@/lib/canonical";
import { getLogsChunked } from "@/lib/logs";
import { sweepOwnedIds } from "@/lib/owned-ids";
import { useEthWallet } from "@/lib/useEthWallet";
import { CardThumb } from "../card-thumb";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { IconWallet, IconCollection, IconPoints } from "../spirit/icons";
import { ReferralPanel } from "./referral-panel";

const publicClient = createPublicClient({
  chain: rhChain,
  transport: http(RH_RPC_URL, { timeout: 8_000, fetchFn: rpcFetch(2) }),
});

const STAKED = parseAbiItem("event Staked(address indexed user, uint256 indexed tokenId, uint256 tier, uint256 weight)");
const UNSTAKED = parseAbiItem("event Unstaked(address indexed user, uint256 indexed tokenId)");

type StakeRow = { id: number; tier: number };

export default function ProfilePage() {
  const wallet = useEthWallet();
  const { address } = wallet;

  const [owned, setOwned] = useState<number[] | null>(null);
  const [staked, setStaked] = useState<StakeRow[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(
    async (who: Address) => {
      setError(null);
      setScanning(true);
      try {
        const totalMinted = await publicClient.readContract({
          address: CORE_ADDRESS,
          abi: PROOF_OF_CARD_ABI,
          functionName: "totalMinted",
        });
        const { owned: ids } = await sweepOwnedIds(publicClient, who, Number(totalMinted), (done) =>
          setScanProgress(done),
        );
        setOwned(ids);

        const latest = await publicClient.getBlockNumber();
        const from = BigInt(CANON_FROM_BLOCK);
        const [stakedLogs, unstakedLogs] = await Promise.all([
          getLogsChunked(publicClient, { address: VAULT_ADDRESS, event: STAKED, args: { user: who }, fromBlock: from, toBlock: latest }),
          getLogsChunked(publicClient, { address: VAULT_ADDRESS, event: UNSTAKED, args: { user: who }, fromBlock: from, toBlock: latest }),
        ]);
        const active = new Map<string, number>();
        for (const log of stakedLogs) if (log.args.tokenId !== undefined) active.set(log.args.tokenId.toString(), Number(log.args.tokenId));
        for (const log of unstakedLogs) if (log.args.tokenId !== undefined) active.delete(log.args.tokenId.toString());
        const rows = await Promise.all(
          [...active.values()].map(async (id): Promise<StakeRow | null> => {
            try {
              const info = await publicClient.readContract({
                address: VAULT_ADDRESS,
                abi: STAKE_VAULT_ABI,
                functionName: "stakes",
                args: [BigInt(id)],
              });
              return { id, tier: Number(info[1]) };
            } catch {
              return null;
            }
          }),
        );
        setStaked(rows.filter((r): r is StakeRow => r !== null));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Scan failed");
      } finally {
        setScanning(false);
      }
    },
    [],
  );

  const loadPoints = useCallback(async (who: Address) => {
    try {
      const res = await fetch(`/api/points?address=${who}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { wallet?: { points: number } };
      setPoints(data.wallet?.points ?? 0);
    } catch {
      setPoints(null);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setOwned(null);
      setStaked([]);
      setPoints(null);
      return;
    }
    void refresh(address);
    void loadPoints(address);
  }, [address, refresh, loadPoints]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [address]);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Profile 我的"
        title="Profile"
        image="/spirit/scene-cards.jpg"
        imageAlt="Spirit Cards profile — your portfolio of cards"
        icon={<IconWallet size={18} />}
        subtitle="Your portfolio — the cards you own, what you have staked in the vault, and your points, read live from chain."
      >
        <StatPill label="Owned" value={owned ? String(owned.length) : "—"} />
        <StatPill label="Staked" value={String(staked.length)} />
        <StatPill label="Points" value={points === null ? "—" : String(points)} />
      </PageHero>

      {!address ? (
        <Panel kicker="Wallet">
          <p className="max-w-md text-sm text-ash">
            Connect your wallet to see the cards it holds and its stakes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="btn-ember px-5 py-2.5 text-xs"
              onClick={() => wallet.connect().catch((e) => setError(e.message))}
            >
              Connect wallet
            </button>
            <button
              className="btn-ghost px-5 py-2.5 text-xs disabled:opacity-40"
              onClick={() => wallet.connectWalletConnect().catch((e) => setError(e.message))}
              disabled={!wallet.wcEnabled}
            >
              WalletConnect
            </button>
          </div>
          {error && (
            <div className="mt-4 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
              {error}
            </div>
          )}
        </Panel>
      ) : (
        <div className="space-y-4">
          <ReferralPanel wallet={wallet} address={address} />
          <Panel kicker="Wallet">
            <div className="flex flex-col gap-2 border-b border-slate/60 pb-4">
              <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                Address
              </span>
              <span className="break-all font-code text-[12px] text-bone">{address}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost px-4 py-2 text-xs"
                onClick={copyAddress}
              >
                {copied ? "Copied ✓" : "Copy address"}
              </button>
              <a
                className="btn-ghost px-4 py-2 text-xs"
                href={explorerUrl(`address/${address}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on explorer ↗
              </a>
              <button
                type="button"
                className="btn-ghost px-4 py-2 text-xs disabled:opacity-40"
                onClick={() => refresh(address)}
                disabled={scanning}
              >
                {scanning ? `Scanning… ${scanProgress}` : "Refresh"}
              </button>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="panel-flat px-4 py-3">
              <p className="flex items-center gap-2 font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                <IconCollection size={14} />
                Cards in wallet
              </p>
              <p className="mt-1 font-code text-2xl font-bold text-bone">
                {owned ? owned.length : "…"}
              </p>
            </div>
            <div className="panel-flat px-4 py-3">
              <p className="flex items-center gap-2 font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                <IconWallet size={14} />
                Staked in vault
              </p>
              <p className="mt-1 font-code text-2xl font-bold text-bone">{staked.length}</p>
            </div>
            <div className="panel-flat px-4 py-3">
              <p className="flex items-center gap-2 font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                <IconPoints size={14} />
                Points
              </p>
              <p className="mt-1 font-code text-2xl font-bold text-gold">
                {points === null ? "…" : points}
              </p>
            </div>
          </div>

          <Panel kicker="Your cards">
            {owned && owned.length === 0 && (
              <p className="mb-4 text-sm text-ash">
                No cards yet —{" "}
                <Link href="/mine" className="text-ember hover:underline">
                  mine one
                </Link>
                .
              </p>
            )}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {(owned ?? []).map((id) => (
                <Link key={id} href={`/token/${id}`} className="group block">
                  <div className="overflow-hidden rounded-[2px] border border-gold/40 bg-[#0b0e12] transition-transform duration-200 group-hover:-translate-y-1">
                    <CardThumb id={id} size={96} className="h-auto w-full" />
                  </div>
                  <span className="mt-2 block font-code text-[11px] tracking-[0.08em] text-bone">
                    #{id}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>

          {staked.length > 0 && (
            <Panel kicker="Staked in the vault">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {staked.map((row) => (
                  <Link key={row.id} href={`/token/${row.id}`} className="group block">
                    <div className="overflow-hidden rounded-[2px] border border-gold/40 bg-[#0b0e12] transition-transform duration-200 group-hover:-translate-y-1">
                      <CardThumb id={row.id} size={96} className="h-auto w-full" />
                    </div>
                    <span className="mt-2 flex items-center justify-between gap-1">
                      <span className="font-code text-[11px] tracking-[0.08em] text-bone">
                        #{row.id}
                      </span>
                      <span className="border border-gold/50 px-1.5 py-0.5 font-code text-[9px] uppercase tracking-[0.12em] text-gold">
                        Tier {row.tier}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}

          {error && (
            <div className="border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
              {error}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
