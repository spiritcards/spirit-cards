"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createWalletClient,
  custom,
  parseGwei,
  type Address,
} from "viem";
import { rhChain, explorerUrl } from "@/lib/rh-chain";
import {
  getPublicClient,
  CORE_ADDRESS,
  BATTLE_ADDRESS,
  BATTLE_ABI,
  PROOF_OF_CARD_ABI,
} from "@/lib/poc";
import { formatUsdc, formatUsd, shortAddress } from "@/lib/format";
import { humanizeRpcError } from "@/lib/rpc";
import { ERC721_APPROVAL_ABI } from "@/lib/staking";
import { sweepOwnedIds } from "@/lib/owned-ids";
import { sweepStakedIds, type StakedCard } from "@/lib/staked-ids";
import { useEthWallet } from "@/lib/useEthWallet";
import { CardThumb } from "../card-thumb";
import BattleFeed from "../battle-feed";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { IconBattle, IconWallet } from "../spirit/icons";

const MIN_FEE_GWEI = Number(process.env.NEXT_PUBLIC_MIN_MAX_FEE_GWEI ?? "1");
const FEE_FLOOR_GWEI = Math.max(1, Number.isFinite(MIN_FEE_GWEI) ? MIN_FEE_GWEI : 1);
const publicClient = getPublicClient();

async function computeFees() {
  let maxFeePerGas = parseGwei(String(FEE_FLOOR_GWEI));
  try {
    const block = await publicClient.getBlock({ blockTag: "latest" });
    const twice = (block.baseFeePerGas ?? 0n) * 2n;
    if (twice > maxFeePerGas) maxFeePerGas = twice;
  } catch {
    /* keep floor */
  }
  return { maxFeePerGas, maxPriorityFeePerGas: maxFeePerGas / 2n };
}

type CardStats = { hp: bigint; atk: bigint; def: bigint; rarity: number };
/** rarity 0..5 → N/R/SR/UR/SSR/Prism. */
const RARITY_LABEL = ["N", "R", "SR", "UR", "SSR", "Prism"];
/** A usable card id: a positive integer with no leading zeros. */
const VALID_ID = /^[1-9]\d*$/;

/** Reads `statsOf(card)` — the stat-derived combat profile of a card. */
async function readStats(client: typeof publicClient, cardId: bigint): Promise<CardStats | null> {
  try {
    const [hp, atk, def, rarity] = await client.readContract({
      address: BATTLE_ADDRESS,
      abi: BATTLE_ABI,
      functionName: "statsOf",
      args: [cardId],
    });
    return { hp, atk, def, rarity: Number(rarity) };
  } catch {
    return null;
  }
}

/** Compact combat-profile badges: HP · ATK · DEF · rarity. */
function StatsBadges({ stats }: { stats: CardStats | null | undefined }) {
  if (stats === undefined) return null;
  if (stats === null)
    return (
      <span className="font-code text-[11px] uppercase tracking-[0.12em] text-ash">
        stats —
      </span>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 font-code text-[11px]">
      <span className="uppercase tracking-[0.1em] text-ash">
        HP <span className="text-hp">{stats.hp.toString()}</span>
      </span>
      <span className="uppercase tracking-[0.1em] text-ash">
        ATK <span className="text-atk">{stats.atk.toString()}</span>
      </span>
      <span className="uppercase tracking-[0.1em] text-ash">
        DEF <span className="text-def">{stats.def.toString()}</span>
      </span>
      <span className="border border-gold/50 px-1.5 py-0.5 uppercase tracking-[0.12em] text-gold">
        {RARITY_LABEL[stats.rarity] ?? "?"}
      </span>
    </span>
  );
}

/** Loads statsOf for a valid id; re-runs when the id changes. */
function useCardStats(id: string): CardStats | null {
  const [stats, setStats] = useState<CardStats | null>(null);
  useEffect(() => {
    if (!VALID_ID.test(id)) {
      setStats(null);
      return;
    }
    let cancelled = false;
    void readStats(publicClient, BigInt(id)).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return stats;
}

type Duel = { id: number; a: string; cardA: bigint; stake: bigint; open: boolean };
type Rating = { id: number; wins: bigint; losses: bigint; lives: bigint };

/** Wins needed to be shown in the "Legendary winners" strip. */
const LEGEND_WINS = 3n;
/** Cap of card ids scanned for the rating (avoid unbounded sweeps). */
const RATING_CAP = 2000;

export default function BattlePage() {
  const wallet = useEthWallet();
  const { address, wrongChain } = wallet;

  const [duels, setDuels] = useState<Duel[] | null>(null);
  const [totalMinted, setTotalMinted] = useState(0);
  const [cards, setCards] = useState<number[] | null>(null);
  const [staked, setStaked] = useState<StakedCard[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const [cardA, setCardA] = useState("");
  const [stakeAmt, setStakeAmt] = useState("");
  const [acceptCardB, setAcceptCardB] = useState("");
  /** Open-duels ordering: newest first, or by stake size. */
  const [duelSort, setDuelSort] = useState<"newest" | "stakeDesc" | "stakeAsc">("newest");

  const [queryCard, setQueryCard] = useState("");
  const [record, setRecord] = useState<{ wins: bigint; losses: bigint; lives: bigint } | null>(null);
  const [rating, setRating] = useState<Rating[] | null>(null);

  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Stat-based combat profiles: selected cards + escrowed cards per open duel.
  const cardAStats = useCardStats(cardA);
  const cardBStats = useCardStats(acceptCardB);
  const [duelStats, setDuelStats] = useState<Record<number, CardStats | null>>({});
  const [previewHints, setPreviewHints] = useState<Record<number, boolean | null>>({});

  const loadDuels = useCallback(async () => {
    try {
      const count = await publicClient.readContract({
        address: BATTLE_ADDRESS,
        abi: BATTLE_ABI,
        functionName: "duelCount",
      });
      const n = Number(count);
      const rows = await Promise.all(
        // duel ids are 1-based (createDuel returns ++duelCount) — iterate 1..n
        Array.from({ length: n }, (_, i) => i + 1).map(async (id): Promise<Duel | null> => {
          try {
            const [a, cA, stake, open] = await publicClient.readContract({
              address: BATTLE_ADDRESS,
              abi: BATTLE_ABI,
              functionName: "duels",
              args: [BigInt(id)],
            });
            return { id, a, cardA: cA, stake, open };
          } catch {
            return null;
          }
        }),
      );
      setDuels(rows.filter((r): r is Duel => r !== null));
    } catch (e) {
      setError(humanizeRpcError(e instanceof Error ? e.message : "Failed to read duels"));
      setDuels([]);
    }
  }, []);

  useEffect(() => {
    void loadDuels();
    publicClient
      .readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "totalMinted" })
      .then((m) => setTotalMinted(Number(m)))
      .catch(() => undefined);
  }, [loadDuels]);

  const scanMyCards = useCallback(
    async (who: Address) => {
      setScanning(true);
      setCards(null);
      setScanProgress(0);
      try {
        const { owned } = await sweepOwnedIds(publicClient, who, totalMinted, (done) => setScanProgress(done));
        setCards(owned);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Card scan failed");
      } finally {
        setScanning(false);
      }
    },
    [totalMinted],
  );

  // Auto-load the wallet's cards on connect — no manual scan button.
  useEffect(() => {
    if (address && !wrongChain) void scanMyCards(address);
    else setCards(null);
  }, [address, wrongChain, scanMyCards]);

  const loadStaked = useCallback(async (who: Address) => {
    try {
      setStaked(await sweepStakedIds(publicClient, who));
    } catch {
      setStaked([]);
    }
  }, []);

  // Staked cards can fight too — load them alongside the wallet's own cards.
  useEffect(() => {
    if (address && !wrongChain) void loadStaked(address);
    else setStaked([]);
  }, [address, wrongChain, loadStaked]);

  const stakedById = useMemo(() => new Map(staked.map((s) => [s.id, s])), [staked]);

  const ensureApproval = useCallback(
    async (walletClient: { writeContract: (args: any) => Promise<`0x${string}`> }) => {
      const approvedAll = await publicClient.readContract({
        address: CORE_ADDRESS,
        abi: ERC721_APPROVAL_ABI,
        functionName: "isApprovedForAll",
        args: [address as Address, BATTLE_ADDRESS],
      });
      if (approvedAll) return;
      const fees = await computeFees();
      const hash = await walletClient.writeContract({
        account: address as Address,
        address: CORE_ADDRESS,
        abi: ERC721_APPROVAL_ABI,
        functionName: "setApprovalForAll",
        args: [BATTLE_ADDRESS, true],
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      setTxHash(hash);
      setStatus("setApprovalForAll submitted. Waiting…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error("setApprovalForAll reverted.");
    },
    [address],
  );

  const createDuel = useCallback(async () => {
    setError(null);
    setTxHash(null);
    const provider = wallet.activeProvider();
    if (!provider || !address) return setError("Connect your wallet first.");
    if (!/^\d+$/.test(cardA) || !/^\d+$/.test(stakeAmt)) return setError("Card id and stake must be integers.");
    if (wrongChain) return void (await wallet.switchToChain());
    setBusy(true);
    try {
      const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
      // A staked card stays in the vault — no NFT approval for the battle needed.
      if (!stakedById.has(Number(cardA))) await ensureApproval(walletClient);
      const stakeWei = BigInt(stakeAmt);
      const fees = await computeFees();
      setStatus("Sending createDuel…");
      const hash = await walletClient.writeContract({
        account: address,
        address: BATTLE_ADDRESS,
        abi: BATTLE_ABI,
        functionName: "createDuel",
        args: [BigInt(cardA), stakeWei],
        value: stakeWei,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      setTxHash(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      setStatus(receipt.status === "success" ? "Duel created." : "");
      if (receipt.status !== "success") setError("createDuel reverted.");
      await loadDuels();
    } catch (e) {
      const message = e instanceof Error ? e.message : "createDuel failed";
      setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
    } finally {
      setBusy(false);
    }
  }, [wallet, address, cardA, stakeAmt, wrongChain, ensureApproval, loadDuels, stakedById]);

  const acceptDuel = useCallback(
    async (duel: Duel) => {
      setError(null);
      setTxHash(null);
      const provider = wallet.activeProvider();
      if (!provider || !address) return setError("Connect your wallet first.");
      if (!/^\d+$/.test(acceptCardB)) return setError("Enter the id of the card you want to fight with.");
      if (wrongChain) return void (await wallet.switchToChain());
      setBusy(true);
    try {
      const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
      if (!stakedById.has(Number(acceptCardB))) await ensureApproval(walletClient);
      const fees = await computeFees();
      setStatus(`Sending acceptDuel(${duel.id})…`);
        const hash = await walletClient.writeContract({
          account: address,
          address: BATTLE_ADDRESS,
          abi: BATTLE_ABI,
          functionName: "acceptDuel",
          args: [BigInt(duel.id), BigInt(acceptCardB)],
          value: duel.stake,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        setTxHash(hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
        setStatus(receipt.status === "success" ? `Duel #${duel.id} resolved.` : "");
        if (receipt.status !== "success") setError("acceptDuel reverted.");
        await loadDuels();
      } catch (e) {
        const message = e instanceof Error ? e.message : "acceptDuel failed";
        setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
      } finally {
        setBusy(false);
      }
    },
    [wallet, address, acceptCardB, wrongChain, ensureApproval, loadDuels, stakedById],
  );

  const cancelDuel = useCallback(
    async (duel: Duel) => {
      setError(null);
      setTxHash(null);
      const provider = wallet.activeProvider();
      if (!provider || !address) return setError("Connect your wallet first.");
      if (wrongChain) return void (await wallet.switchToChain());
      setBusy(true);
      try {
        const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
        const fees = await computeFees();
        setStatus(`Sending cancelDuel(${duel.id})…`);
        const hash = await walletClient.writeContract({
          account: address,
          address: BATTLE_ADDRESS,
          abi: BATTLE_ABI,
          functionName: "cancelDuel",
          args: [BigInt(duel.id)],
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        setTxHash(hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
        setStatus(receipt.status === "success" ? `Duel #${duel.id} cancelled.` : "");
        if (receipt.status !== "success") setError("cancelDuel reverted.");
        await loadDuels();
      } catch (e) {
        const message = e instanceof Error ? e.message : "cancelDuel failed";
        setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
      } finally {
        setBusy(false);
      }
    },
    [wallet, address, wrongChain, loadDuels],
  );

  const loadRecord = useCallback(async () => {
    if (!/^\d+$/.test(queryCard)) {
      setRecord(null);
      return;
    }
    try {
      const card = BigInt(queryCard);
      const [wins, losses, lives] = await Promise.all([
        publicClient.readContract({ address: BATTLE_ADDRESS, abi: BATTLE_ABI, functionName: "wins", args: [card] }),
        publicClient.readContract({ address: BATTLE_ADDRESS, abi: BATTLE_ABI, functionName: "losses", args: [card] }),
        publicClient.readContract({ address: BATTLE_ADDRESS, abi: BATTLE_ABI, functionName: "lives", args: [card] }),
      ]);
      setRecord({ wins, losses, lives });
    } catch {
      setRecord(null);
    }
  }, [queryCard]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const loadRating = useCallback(async () => {
    try {
      const m = await publicClient.readContract({
        address: CORE_ADDRESS,
        abi: PROOF_OF_CARD_ABI,
        functionName: "totalMinted",
      });
      const n = Math.min(Number(m), RATING_CAP);
      const rows = await Promise.all(
        Array.from({ length: n }, (_, i) => i + 1).map(async (id): Promise<Rating | null> => {
          try {
            const [w, l, li] = await Promise.all([
              publicClient.readContract({ address: BATTLE_ADDRESS, abi: BATTLE_ABI, functionName: "wins", args: [BigInt(id)] }),
              publicClient.readContract({ address: BATTLE_ADDRESS, abi: BATTLE_ABI, functionName: "losses", args: [BigInt(id)] }),
              publicClient.readContract({ address: BATTLE_ADDRESS, abi: BATTLE_ABI, functionName: "lives", args: [BigInt(id)] }),
            ]);
            return { id, wins: w as bigint, losses: l as bigint, lives: li as bigint };
          } catch {
            return null;
          }
        }),
      );
      const fought = rows.filter(
        (r): r is Rating => r !== null && (r.wins > 0n || r.losses > 0n),
      );
      fought.sort((a, b) =>
        b.wins > a.wins ? 1 : b.wins < a.wins ? -1 : a.losses < b.losses ? -1 : 1,
      );
      setRating(fought);
    } catch {
      setRating([]);
    }
  }, []);

  useEffect(() => {
    void loadRating();
  }, [loadRating]);

  // Stats of each open duel's escrowed card, so a challenger can size it up.
  useEffect(() => {
    const open = (duels ?? []).filter((d) => d.open);
    if (open.length === 0) {
      setDuelStats({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      open.map((d) => readStats(publicClient, d.cardA).then((s) => [d.id, s] as const)),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<number, CardStats | null> = {};
      for (const [id, s] of entries) next[id] = s;
      setDuelStats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [duels]);

  // Win hint: preview(cardA, acceptCardB, duelId) is true when the duel creator (cardA) wins.
  useEffect(() => {
    const open = (duels ?? []).filter((d) => d.open);
    if (!VALID_ID.test(acceptCardB) || open.length === 0) {
      setPreviewHints({});
      return;
    }
    let cancelled = false;
    const cardB = BigInt(acceptCardB);
    void Promise.all(
      open.map((d) =>
        publicClient
          .readContract({
            address: BATTLE_ADDRESS,
            abi: BATTLE_ABI,
            functionName: "preview",
            args: [d.cardA, cardB, BigInt(d.id)],
          })
          .then((aWins) => [d.id, aWins] as const)
          .catch(() => [d.id, null] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<number, boolean | null> = {};
      for (const [id, w] of entries) next[id] = w;
      setPreviewHints(next);
    });
    return () => {
      cancelled = true;
    };
  }, [duels, acceptCardB]);

  const legendary = (rating ?? []).filter((r) => r.wins >= LEGEND_WINS);

  const openDuels = (duels ?? []).filter((d) => d.open);
  const sortedDuels = (() => {
    const list = [...openDuels];
    if (duelSort === "stakeDesc") list.sort((a, b) => (b.stake > a.stake ? 1 : b.stake < a.stake ? -1 : b.id - a.id));
    else if (duelSort === "stakeAsc") list.sort((a, b) => (a.stake > b.stake ? 1 : a.stake < b.stake ? -1 : a.id - b.id));
    else list.sort((a, b) => b.id - a.id); // newest duel id first
    return list;
  })();
  const availableCards = cards ?? [];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Battle Arena 对战"
        title="Battle"
        image="/spirit/scene-dragon.jpg"
        imageAlt="Battle arena — an elemental dragon rising through a hex portal"
        icon={<IconBattle size={18} />}
        subtitle="Escrow a creature and a stake, or accept an open duel with one of yours. Cards carry three lives — lose them all and the creature burns. Staked cards can fight too: they stay in the vault, still earning rewards, locked only for the duel."
      >
        <StatPill label="Open duels" value={duels === null ? "—" : String(openDuels.length)} />
        <StatPill label="Your cards" value={String(availableCards.length)} />
        <StatPill label="Staked" value={String(staked.length)} />
      </PageHero>

      <BattleFeed />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ── wallet ───────────────────────────────────────────────────── */}
        <Panel kicker="Wallet" className="lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="hex grid h-9 w-9 place-items-center border border-tide/50 bg-tide/10 text-tide">
                <IconWallet size={17} />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {address ? (
                  <>
                    <span className="font-code text-sm text-bone">{shortAddress(address)}</span>
                    <span
                      className={`border px-2 py-0.5 font-code text-[10px] uppercase tracking-[0.14em] ${
                        !wrongChain ? "border-moss/50 text-moss" : "border-magma/50 text-magma"
                      }`}
                    >
                      chain {wallet.chainId ?? "?"}
                    </span>
                  </>
                ) : (
                  <span className="font-code text-sm text-ash">not connected</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!address ? (
                <>
                  <button
                    className={
                      wallet.hasInjected
                        ? "btn-ember bg-ember! border-ember! text-obsidian! min-h-0! px-6! py-3! shadow-none! font-display! disabled:opacity-50"
                        : "btn-ghost bg-transparent! border! border-slate! text-bone! min-h-0! px-5! py-3! shadow-none! font-display! disabled:opacity-50"
                    }
                    onClick={() => wallet.connect().catch((e) => setError(e.message))}
                  >
                    Connect wallet
                  </button>
                  <button
                    className={
                      wallet.hasInjected
                        ? "btn-ghost bg-transparent! border! border-slate! text-bone! min-h-0! px-5! py-3! shadow-none! font-display! disabled:opacity-50"
                        : "btn-ember bg-ember! border-ember! text-obsidian! min-h-0! px-6! py-3! shadow-none! font-display! disabled:opacity-50"
                    }
                    onClick={() => wallet.connectWalletConnect().catch((e) => setError(e.message))}
                    disabled={!wallet.wcEnabled}
                  >
                    WalletConnect (QR)
                  </button>
                </>
              ) : wrongChain ? (
                <button
                  className="btn-ember bg-ember! border-ember! text-obsidian! min-h-0! px-6! py-3! shadow-none! font-display! disabled:opacity-50"
                  onClick={() => wallet.switchToChain()}
                >
                  Switch to Robinhood Chain
                </button>
              ) : scanning ? (
                <span className="font-code text-xs uppercase tracking-[0.14em] text-ash">
                  Loading your cards…{scanProgress > 0 ? ` (${scanProgress})` : ""}
                </span>
              ) : (
                <span className="font-code text-xs uppercase tracking-[0.14em] text-ash">
                  {availableCards.length} in wallet · {staked.length} staked
                </span>
              )}
            </div>
          </div>

          {address && (availableCards.length > 0 || staked.length > 0) && (
            <div className="mt-5 flex flex-wrap gap-2.5 border-t border-slate/40 pt-5">
              {availableCards.map((id) => (
                <button
                  key={`w-${id}`}
                  type="button"
                  aria-pressed={cardA === String(id)}
                  className={`flex flex-col items-center gap-1 border! bg-basalt! min-h-0! p-1! shadow-none! rounded-none! transition-colors ${
                    cardA === String(id) ? "border-ember!" : "border-slate! hover:border-ember!"
                  }`}
                  onClick={() => setCardA(String(id))}
                >
                  <span
                    className="glow-halo"
                    style={{ "--glow": "var(--color-ember)" } as React.CSSProperties}
                  >
                    <CardThumb id={id} size={54} className="relative z-[1]" />
                  </span>
                  <span className="font-code text-[10px] tracking-[0.08em] text-ash">#{id}</span>
                </button>
              ))}
              {staked.map((s) => (
                <button
                  key={`s-${s.id}`}
                  type="button"
                  aria-pressed={cardA === String(s.id)}
                  className={`flex flex-col items-center gap-1 border! bg-basalt! min-h-0! p-1! shadow-none! rounded-none! transition-colors disabled:opacity-50 ${
                    cardA === String(s.id) ? "border-ember!" : "border-moss/50! hover:border-ember!"
                  }`}
                  onClick={() => setCardA(String(s.id))}
                  disabled={s.inBattle}
                  title={s.inBattle ? "Locked in an open duel" : "Staked — still earn rewards while fighting"}
                >
                  <span
                    className="glow-halo"
                    style={{ "--glow": "var(--color-moss)" } as React.CSSProperties}
                  >
                    <CardThumb id={s.id} size={54} className="relative z-[1]" />
                  </span>
                  <span className="font-code text-[10px] tracking-[0.08em] text-ash">#{s.id}</span>
                  <span
                    className={`border px-1.5 py-0.5 font-code text-[9px] uppercase tracking-[0.12em] ${
                      s.inBattle ? "border-magma/50 text-magma" : "border-moss/50 text-moss"
                    }`}
                  >
                    {s.inBattle ? "in duel" : "staked"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* ── create a duel ────────────────────────────────────────────── */}
        <Panel kicker="Create a Duel 发起对战" className="lg:col-span-5">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {VALID_ID.test(cardA) ? (
                <span
                  className="glow-halo flex-none"
                  style={{ "--glow": "var(--color-ember)" } as React.CSSProperties}
                >
                  <CardThumb id={cardA} size={84} className="relative z-[1]" />
                </span>
              ) : (
                <span className="hex grid h-[84px] w-[84px] flex-none place-items-center border border-slate bg-basalt text-ash/80">
                  <IconBattle size={30} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="m-0 font-display text-lg font-bold uppercase leading-tight tracking-tight text-bone">
                  {VALID_ID.test(cardA) ? `Card #${cardA}` : "Select a card"}
                </p>
                <p className="mt-1 mb-0 font-code text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ash">
                  Pick from “Your Creatures” above, or type an id
                </p>
                {VALID_ID.test(cardA) && (
                  <div className="mt-2">
                    <StatsBadges stats={cardAStats} />
                  </div>
                )}
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                Card id
              </span>
              <input
                type="text"
                placeholder="e.g. 7"
                value={cardA}
                onChange={(e) => setCardA(e.target.value.trim())}
                className="w-full! min-w-0! border! border-slate! bg-basalt! text-bone! font-code! min-h-0! px-3! py-2! shadow-none! rounded-none!"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                Stake (wei)
              </span>
              <input
                type="text"
                placeholder="e.g. 1000000000000000"
                value={stakeAmt}
                onChange={(e) => setStakeAmt(e.target.value.trim())}
                className="w-full! min-w-0! border! border-slate! bg-basalt! text-bone! font-code! min-h-0! px-3! py-2! shadow-none! rounded-none!"
              />
              {/^\d+$/.test(stakeAmt) && stakeAmt.replace(/^0+/, "") !== "" && (
                <span className="font-code text-[11px] tracking-[0.06em] text-gold">
                  ≈ {formatUsd(BigInt(stakeAmt))}
                  <span className="text-ash"> · {formatUsdc(BigInt(stakeAmt))} ETH</span>
                </span>
              )}
            </label>
            <button
              className="btn-ember bg-ember! border-ember! text-obsidian! min-h-0! w-full! justify-center! px-6! py-3! shadow-none! font-display! disabled:opacity-50"
              onClick={createDuel}
              disabled={busy || !address || wrongChain}
            >
              {busy ? "Working…" : "Create duel"}
            </button>
          </div>
        </Panel>

        {/* ── open duels ───────────────────────────────────────────────── */}
        <Panel kicker="Open Duels 对战大厅" className="lg:col-span-7">
          {duels === null ? (
            <div className="border border-slate/50 bg-obsidian/40 px-4 py-3 font-code text-sm text-ash">
              Loading…
            </div>
          ) : openDuels.length === 0 ? (
            <div className="border border-slate/50 bg-obsidian/40 px-4 py-3 font-code text-sm text-ash">
              No open duels yet — create the first one.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                  {openDuels.length} open
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    ["newest", "Newest"],
                    ["stakeDesc", "Stake ↓"],
                    ["stakeAsc", "Stake ↑"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDuelSort(key)}
                      aria-pressed={duelSort === key}
                      className={
                        duelSort === key
                          ? "btn-ember bg-ember! border-ember! text-obsidian! min-h-0! justify-center! px-4! py-2! text-xs! shadow-none! font-display!"
                          : "btn-ghost bg-transparent! border! border-slate! text-ash! min-h-0! justify-center! px-4! py-2! text-xs! shadow-none! font-display! hover:text-bone!"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[28rem] overflow-y-auto border border-slate/40 bg-obsidian/20 p-2.5 [scrollbar-color:var(--color-slate)_transparent]">
                <ul className="flex flex-col gap-3">
                  {sortedDuels.map((duel) => {
                const mine = !!address && duel.a.toLowerCase() === address.toLowerCase();
                return (
                  <li
                    key={duel.id}
                    className="flex flex-wrap items-center gap-4 border border-slate/60 bg-obsidian/30 p-3"
                  >
                    <span
                      className="glow-halo flex-none"
                      style={{ "--glow": "var(--color-ember)" } as React.CSSProperties}
                    >
                      <CardThumb id={duel.cardA} size={64} className="relative z-[1]" />
                    </span>
                    <div className="min-w-[150px] flex-1">
                      <p className="m-0 font-display text-sm font-bold uppercase tracking-[0.06em] text-bone">
                        Duel #{duel.id} · Card #{duel.cardA.toString()}
                      </p>
                      <p className="mt-0.5 mb-0 font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                        by {shortAddress(duel.a)}
                      </p>
                      <div className="mt-1.5">
                        <StatsBadges stats={duelStats[duel.id]} />
                      </div>
                    </div>
                    <div className="flex-none border-l border-slate/50 pl-4 text-right">
                      <p className="m-0 font-code text-xl font-bold leading-none text-gold">
                        {formatUsd(duel.stake)}
                      </p>
                      <p className="mt-1 mb-0 font-code text-[9px] uppercase tracking-[0.16em] text-ash">
                        ≈ {formatUsdc(duel.stake)} ETH
                      </p>
                    </div>
                    <div className="flex-none">
                      {mine ? (
                        <button
                          className="btn-ghost bg-transparent! border! border-slate! text-bone! min-h-0! px-4! py-2! text-xs! shadow-none! font-display! disabled:opacity-50"
                          onClick={() => cancelDuel(duel)}
                          disabled={busy || wrongChain}
                        >
                          cancel
                        </button>
                      ) : (
                        <div className="flex flex-col items-end gap-2">
                          <input
                            type="text"
                            placeholder="your card id"
                            value={acceptCardB}
                            onChange={(e) => setAcceptCardB(e.target.value.trim())}
                            className="w-[120px]! min-w-0! border! border-slate! bg-basalt! text-bone! font-code! min-h-0! px-3! py-2! shadow-none! rounded-none!"
                          />
                          {VALID_ID.test(acceptCardB) && (
                            <div className="flex flex-col items-end gap-1">
                              <StatsBadges stats={cardBStats} />
                              {previewHints[duel.id] === false && (
                                <span className="font-code text-[11px] uppercase tracking-[0.12em] text-moss">
                                  You are favored
                                </span>
                              )}
                              {previewHints[duel.id] === true && (
                                <span className="font-code text-[11px] uppercase tracking-[0.12em] text-magma">
                                  You are the underdog
                                </span>
                              )}
                            </div>
                          )}
                          <button
                            className="btn-ember bg-ember! border-ember! text-obsidian! min-h-0! px-5! py-2! text-xs! shadow-none! font-display! disabled:opacity-50"
                            onClick={() => acceptDuel(duel)}
                            disabled={busy || !address || wrongChain}
                          >
                            accept
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
                  })}
                </ul>
              </div>
            </>
          )}
        </Panel>

        {/* ── card record ──────────────────────────────────────────────── */}
        <Panel kicker="Card Record" className="lg:col-span-5">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                Card id
              </span>
              <input
                type="text"
                placeholder="card id"
                value={queryCard}
                onChange={(e) => setQueryCard(e.target.value.trim())}
                className="w-full! min-w-0! border! border-slate! bg-basalt! text-bone! font-code! min-h-0! px-3! py-2! shadow-none! rounded-none!"
              />
            </label>
            {record && (
              <div className="flex items-center gap-4">
                {VALID_ID.test(queryCard) && (
                  <span
                    className="glow-halo flex-none"
                    style={{ "--glow": "var(--color-gold)" } as React.CSSProperties}
                  >
                    <CardThumb id={queryCard} size={72} className="relative z-[1]" />
                  </span>
                )}
                <div className="grid flex-1 grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1 border border-slate/60 bg-obsidian/40 px-3 py-3 text-center">
                    <p className="m-0! font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                      Wins
                    </p>
                    <p className="m-0! font-code text-2xl font-bold text-gold">
                      {record.wins.toString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 border border-slate/60 bg-obsidian/40 px-3 py-3 text-center">
                    <p className="m-0! font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                      Losses
                    </p>
                    <p className="m-0! font-code text-2xl font-bold text-magma">
                      {record.losses.toString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 border border-slate/60 bg-obsidian/40 px-3 py-3 text-center">
                    <p className="m-0! font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                      Lives
                    </p>
                    <p className="m-0! font-code text-2xl font-bold text-hp">
                      {record.lives.toString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* ── battle rating ────────────────────────────────────────────── */}
        <Panel kicker="Battle Rating 战斗排行榜" className="lg:col-span-7">
          {rating === null ? (
            <div className="border border-slate/50 bg-obsidian/40 px-4 py-3 font-code text-sm text-ash">
              Loading…
            </div>
          ) : rating.length === 0 ? (
            <div className="border border-slate/50 bg-obsidian/40 px-4 py-3 font-code text-sm text-ash">
              No battles yet — be the first to duel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate/70">
                    {["#", "Card", "W", "L", "Lives", "Score"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 font-code text-[10px] font-normal uppercase tracking-[0.14em] text-ash"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rating.slice(0, 25).map((r, i) => (
                    <tr key={r.id} className="border-b border-slate/40">
                      <td className="px-3 py-2 font-code text-sm text-ash">{i + 1}</td>
                      <td className="px-3 py-2 font-code text-sm">
                        <Link
                          href={`/token/${r.id}`}
                          className="text-ember! no-underline! hover:underline"
                        >
                          #{r.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-code text-sm text-gold">{r.wins.toString()}</td>
                      <td className="px-3 py-2 font-code text-sm text-magma">
                        {r.losses.toString()}
                      </td>
                      <td className="px-3 py-2 font-code text-sm text-bone">{r.lives.toString()}</td>
                      <td className="px-3 py-2 font-code text-sm text-bone">
                        {(r.wins * 3n + r.lives - r.losses).toString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ── legendary winners ────────────────────────────────────────── */}
        <Panel kicker="Legendary Winners 传奇卡" className="lg:col-span-12">
          {legendary.length === 0 ? (
            <div className="border border-slate/50 bg-obsidian/40 px-4 py-3 font-code text-sm text-ash">
              No legendary winners yet — reach {LEGEND_WINS.toString()} wins to enter the hall.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {legendary.map((r) => (
                <Link
                  key={r.id}
                  href={`/token/${r.id}`}
                  className="flex flex-col items-center gap-1 border border-slate/60 bg-basalt px-2 py-2 no-underline! transition-colors hover:border-ember"
                >
                  <span
                    className="glow-halo"
                    style={{ "--glow": "var(--color-gold)" } as React.CSSProperties}
                  >
                    <CardThumb id={r.id} size={56} className="relative z-[1]" />
                  </span>
                  <span className="font-code text-[10px] tracking-[0.08em] text-gold">
                    #{r.id} · {r.wins.toString()}W
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── transaction status ─────────────────────────────────────────── */}
      {status && !error && (
        <div className="mt-4 border border-moss/50 bg-moss/5 px-4 py-3 font-code text-sm text-moss">
          {status}
        </div>
      )}
      {error && (
        <div className="mt-4 border border-magma/50 bg-magma/5 px-4 py-3 font-code text-sm text-magma">
          {error}
        </div>
      )}
      {txHash && (
        <div className="mt-4 border border-slate/70 bg-basalt px-4 py-3 font-code text-sm text-ash">
          tx:{" "}
          <a
            href={explorerUrl(`tx/${txHash}`)}
            target="_blank"
            rel="noreferrer"
            className="font-code text-ember! no-underline! hover:underline"
          >
            {txHash}
          </a>
        </div>
      )}
    </main>
  );
}
