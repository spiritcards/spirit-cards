"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWalletClient,
  custom,
  parseAbiItem,
  parseGwei,
  type Address,
} from "viem";
import { rhChain, explorerUrl } from "@/lib/rh-chain";
import {
  getPublicClient,
  CORE_ADDRESS,
  VAULT_ADDRESS,
  PROOF_OF_CARD_ABI,
  STAKE_VAULT_ABI,
} from "@/lib/poc";
import { formatUsdc } from "@/lib/format";
import { CANON_FROM_BLOCK } from "@/lib/canonical";
import { getLogsChunked } from "@/lib/logs";
import {
  ERC721_APPROVAL_ABI,
  readStakeTiers,
  tierLabel,
  weightLabel,
  weightMultiplier,
  shortLock,
  formatUnlockDate,
  type StakeTier,
} from "@/lib/staking";
import { sweepOwnedIds } from "@/lib/owned-ids";
import { useEthWallet } from "@/lib/useEthWallet";
import { CardThumb } from "../card-thumb";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { IconStake } from "../spirit/icons";

const MIN_FEE_GWEI = Number(process.env.NEXT_PUBLIC_MIN_MAX_FEE_GWEI ?? "1");
const FEE_FLOOR_GWEI = Math.max(1, Number.isFinite(MIN_FEE_GWEI) ? MIN_FEE_GWEI : 1);
const publicClient = getPublicClient();

const STAKED = parseAbiItem("event Staked(address indexed user, uint256 indexed tokenId, uint256 tier, uint256 weight)");
const UNSTAKED = parseAbiItem("event Unstaked(address indexed user, uint256 indexed tokenId)");

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

type StakeRow = { tokenId: bigint; tier: number; weight: bigint; pending: bigint; stakedAt: bigint };

/** One cell of the live-payoff row under the tier seals. */
function PayoffCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-code text-[9px] uppercase tracking-[0.16em] text-ash">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold leading-none ${accent ? "text-ember" : "text-bone"}`}>
        {value}
      </p>
    </div>
  );
}

export default function StakePage() {
  const wallet = useEthWallet();
  const { address, wrongChain } = wallet;

  const [tiers, setTiers] = useState<StakeTier[]>([]);
  const [selectedTier, setSelectedTier] = useState(2);
  const [totalWeight, setTotalWeight] = useState<bigint | null>(null);
  const [totalMinted, setTotalMinted] = useState(0);
  const [cards, setCards] = useState<number[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [myStakes, setMyStakes] = useState<StakeRow[] | null>(null);
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [tierRows, minted, tw] = await Promise.all([
        readStakeTiers(),
        publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "totalMinted" }),
        publicClient.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "totalWeight" }),
      ]);
      setTiers(tierRows);
      setTotalMinted(Number(minted));
      setTotalWeight(tw);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read the vault");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Remember the chosen tier across visits (default: 30d = index 2).
  useEffect(() => {
    const raw = window.localStorage.getItem("poc.stake.tier");
    if (raw === null) return;
    const saved = Number(raw);
    if (Number.isInteger(saved) && saved >= 0 && saved < 6) setSelectedTier(saved);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("poc.stake.tier", String(selectedTier));
  }, [selectedTier]);

  const loadMyStakes = useCallback(
    async (who: Address) => {
      try {
        const latest = await publicClient.getBlockNumber();
        const from = BigInt(CANON_FROM_BLOCK);
        const [stakedLogs, unstakedLogs] = await Promise.all([
          getLogsChunked(publicClient, { address: VAULT_ADDRESS, event: STAKED, args: { user: who }, fromBlock: from, toBlock: latest }),
          getLogsChunked(publicClient, { address: VAULT_ADDRESS, event: UNSTAKED, args: { user: who }, fromBlock: from, toBlock: latest }),
        ]);
        const active = new Map<string, bigint>();
        for (const log of stakedLogs) {
          const id = log.args.tokenId;
          if (id !== undefined) active.set(id.toString(), id);
        }
        for (const log of unstakedLogs) {
          const id = log.args.tokenId;
          if (id !== undefined) active.delete(id.toString());
        }
        const rows = await Promise.all(
          [...active.values()].map(async (tokenId): Promise<StakeRow | null> => {
            try {
              const [info, pending] = await Promise.all([
                publicClient.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "stakes", args: [tokenId] }),
                publicClient.readContract({ address: VAULT_ADDRESS, abi: STAKE_VAULT_ABI, functionName: "pending", args: [tokenId] }),
              ]);
              return { tokenId, tier: Number(info[1]), weight: info[2], pending, stakedAt: info[3] };
            } catch {
              return null;
            }
          }),
        );
        setMyStakes(rows.filter((r): r is StakeRow => r !== null));
      } catch {
        setMyStakes([]);
      }
    },
    [],
  );

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

  useEffect(() => {
    if (address) void loadMyStakes(address);
    else setMyStakes(null);
  }, [address, loadMyStakes]);

  // Auto-load the wallet's cards as soon as it is connected — no manual scan.
  useEffect(() => {
    setSelectedIds([]);
    if (address && !wrongChain) void scanMyCards(address);
    else setCards(null);
  }, [address, wrongChain, scanMyCards]);

  const toggleCard = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const ensureApproval = useCallback(
    async (
      walletClient: { writeContract: (args: any) => Promise<`0x${string}`> },
      approvedAll: boolean,
    ) => {
      if (approvedAll) return;
      const fees = await computeFees();
      const hash = await walletClient.writeContract({
        account: address as Address,
        address: CORE_ADDRESS,
        abi: ERC721_APPROVAL_ABI,
        functionName: "setApprovalForAll",
        args: [VAULT_ADDRESS, true],
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      setTxHash(hash);
      setStatus("setApprovalForAll submitted. Waiting for receipt…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error("setApprovalForAll reverted.");
    },
    [address],
  );

  const stake = useCallback(
    async (tokenId: bigint) => {
      setError(null);
      setTxHash(null);
      const provider = wallet.activeProvider();
      if (!provider || !address) {
        setError("Connect your wallet first.");
        return;
      }
      if (wrongChain) {
        await wallet.switchToChain();
        return;
      }
      setBusy(true);
      try {
        const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
        const approvedAll = await publicClient.readContract({
          address: CORE_ADDRESS,
          abi: ERC721_APPROVAL_ABI,
          functionName: "isApprovedForAll",
          args: [address, VAULT_ADDRESS],
        });
        await ensureApproval(walletClient, approvedAll);

        const fees = await computeFees();
        setStatus(`Sending stake(${tokenId}, ${selectedTier})…`);
        const hash = await walletClient.writeContract({
          account: address,
          address: VAULT_ADDRESS,
          abi: STAKE_VAULT_ABI,
          functionName: "stake",
          args: [tokenId, BigInt(selectedTier)],
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        setTxHash(hash);
        setStatus("stake submitted. Waiting…");
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
        if (receipt.status === "success") {
          setStatus(`Staked #${tokenId} as ${tierLabel(selectedTier)} (block ${receipt.blockNumber}).`);
          setTokenIdInput("");
          void scanMyCards(address);
        } else {
          setError("stake reverted on-chain.");
        }
        await Promise.all([refresh(), loadMyStakes(address)]);
      } catch (e) {
        const message = e instanceof Error ? e.message : "stake failed";
        setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
        setStatus("");
      } finally {
        setBusy(false);
      }
    },
    [wallet, address, wrongChain, selectedTier, ensureApproval, refresh, loadMyStakes, scanMyCards],
  );

  const stakeBatch = useCallback(async () => {
    setError(null);
    setTxHash(null);
    const provider = wallet.activeProvider();
    if (!provider || !address) {
      setError("Connect your wallet first.");
      return;
    }
    if (wrongChain) {
      await wallet.switchToChain();
      return;
    }
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
      const approvedAll = await publicClient.readContract({
        address: CORE_ADDRESS,
        abi: ERC721_APPROVAL_ABI,
        functionName: "isApprovedForAll",
        args: [address, VAULT_ADDRESS],
      });
      await ensureApproval(walletClient, approvedAll);

      const ids = selectedIds.map((x) => BigInt(x));
      const fees = await computeFees();
      setStatus(`Sending stakeBatch(${ids.length} cards, tier ${selectedTier})…`);
      const hash = await walletClient.writeContract({
        account: address,
        address: VAULT_ADDRESS,
        abi: STAKE_VAULT_ABI,
        functionName: "stakeBatch",
        args: [ids, BigInt(selectedTier)],
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      setTxHash(hash);
      setStatus("stakeBatch submitted. Waiting…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
      if (receipt.status === "success") {
        setStatus(`Staked ${ids.length} cards as ${tierLabel(selectedTier)} (block ${receipt.blockNumber}).`);
        setSelectedIds([]);
        void scanMyCards(address);
      } else {
        setError("stakeBatch reverted on-chain.");
      }
      await Promise.all([refresh(), loadMyStakes(address)]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "stakeBatch failed";
      setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }, [
    wallet,
    address,
    wrongChain,
    selectedIds,
    selectedTier,
    ensureApproval,
    refresh,
    loadMyStakes,
    scanMyCards,
  ]);

  const unstake = useCallback(
    async (tokenId: bigint) => {
      setError(null);
      setTxHash(null);
      const provider = wallet.activeProvider();
      if (!provider || !address) {
        setError("Connect your wallet first.");
        return;
      }
      setBusy(true);
      try {
        const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
        const fees = await computeFees();
        setStatus(`Sending unstake(${tokenId})…`);
        const hash = await walletClient.writeContract({
          account: address,
          address: VAULT_ADDRESS,
          abi: STAKE_VAULT_ABI,
          functionName: "unstake",
          args: [tokenId],
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        setTxHash(hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
        setStatus(receipt.status === "success" ? `Unstaked #${tokenId}.` : "");
        if (receipt.status !== "success") setError("unstake reverted on-chain.");
        await Promise.all([refresh(), loadMyStakes(address)]);
      } catch (e) {
        const message = e instanceof Error ? e.message : "unstake failed";
        setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
      } finally {
        setBusy(false);
      }
    },
    [wallet, address, refresh, loadMyStakes],
  );

  const claim = useCallback(
    async (tokenId: bigint) => {
      setError(null);
      setTxHash(null);
      const provider = wallet.activeProvider();
      if (!provider || !address) {
        setError("Connect your wallet first.");
        return;
      }
      setBusy(true);
      try {
        const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
        const fees = await computeFees();
        setStatus(`Sending claim(${tokenId})…`);
        const hash = await walletClient.writeContract({
          account: address,
          address: VAULT_ADDRESS,
          abi: STAKE_VAULT_ABI,
          functionName: "claim",
          args: [tokenId],
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        setTxHash(hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
        setStatus(receipt.status === "success" ? `Claimed rewards for #${tokenId}.` : "");
        if (receipt.status !== "success") setError("claim reverted on-chain.");
        if (address) await loadMyStakes(address);
      } catch (e) {
        const message = e instanceof Error ? e.message : "claim failed";
        setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
      } finally {
        setBusy(false);
      }
    },
    [wallet, address, loadMyStakes],
  );

  const claimAll = useCallback(async () => {
    const provider = wallet.activeProvider();
    if (!provider || !address || !myStakes || myStakes.length === 0) return;
    setError(null);
    setTxHash(null);
    setBusy(true);
    try {
      const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
      const ids = myStakes.map((r) => r.tokenId);
      const fees = await computeFees();
      setStatus(`claimBatch(${ids.length})…`);
      const hash = await walletClient.writeContract({
        account: address,
        address: VAULT_ADDRESS,
        abi: STAKE_VAULT_ABI,
        functionName: "claimBatch",
        args: [ids],
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      setTxHash(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
      setStatus(receipt.status === "success" ? `Claimed rewards for ${ids.length} stake(s).` : "");
      if (receipt.status !== "success") setError("claimBatch reverted on-chain.");
      await loadMyStakes(address);
    } catch (e) {
      const message = e instanceof Error ? e.message : "claimBatch failed";
      setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
    } finally {
      setBusy(false);
    }
  }, [wallet, address, myStakes, loadMyStakes]);

  const unstakeReady = useCallback(async () => {
    const provider = wallet.activeProvider();
    if (!provider || !address || !myStakes) return;
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const ids = myStakes
      .filter((r) => nowSec >= r.stakedAt + (tiers[r.tier]?.lockSeconds ?? 0n))
      .map((r) => r.tokenId);
    if (ids.length === 0) {
      setError("No unlocked cards to unstake.");
      return;
    }
    setError(null);
    setTxHash(null);
    setBusy(true);
    try {
      const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
      const fees = await computeFees();
      setStatus(`unstakeBatch(${ids.length})…`);
      const hash = await walletClient.writeContract({
        account: address,
        address: VAULT_ADDRESS,
        abi: STAKE_VAULT_ABI,
        functionName: "unstakeBatch",
        args: [ids],
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      setTxHash(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
      setStatus(receipt.status === "success" ? `Unstaked ${ids.length} card(s).` : "");
      if (receipt.status !== "success") setError("unstakeBatch reverted on-chain.");
      await Promise.all([loadMyStakes(address), scanMyCards(address)]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "unstakeBatch failed";
      setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
    } finally {
      setBusy(false);
    }
  }, [wallet, address, myStakes, tiers, loadMyStakes, scanMyCards]);

  const activeTokenId = /^\d+$/.test(tokenIdInput.trim()) ? BigInt(tokenIdInput.trim()) : null;
  const availableCards = cards ?? [];
  const maxWeight = tiers.reduce((m, t) => (t.weightX1000 > m ? t.weightX1000 : m), 0n) || 1n;
  const selTier = tiers[selectedTier];
  const selLabel = selTier ? shortLock(selTier.lockSeconds) : tierLabel(selectedTier);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Stake 质押"
        title="Stake"
        image="/spirit/scene-cards.jpg"
        imageAlt="Spirit Cards — the staking vault"
        icon={<IconStake size={18} />}
        position="object-right"
        subtitle="Lock cards in the StakeVault to earn pool weight and dividends. Longer locks carry bigger weight — choose a tier, stake a single card or a whole batch, and claim rewards while the lock runs."
      >
        <StatPill label="Total weight" value={totalWeight === null ? "…" : totalWeight.toString()} />
        <StatPill label="Cards" value={String(availableCards.length)} />
        <StatPill label="My stakes" value={myStakes === null ? "—" : String(myStakes.length)} />
      </PageHero>

      <Panel kicker="Stake Vault">
        <p className="max-w-3xl text-sm leading-relaxed text-ash">
          Lock cards in the StakeVault to earn pool weight and rewards. Select
          several cards and stake them all in one transaction (
          <span className="font-code text-ember">stakeBatch</span>), or stake one
          at a time (<span className="font-code text-ember">stake</span>). You
          must first approve the vault (
          <span className="font-code text-ember">setApprovalForAll</span>).
        </p>

        <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center justify-between gap-3 border border-slate/60 bg-obsidian/40 px-3 py-2 sm:flex-col sm:items-start">
            <dt className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">Wallet</dt>
            <dd className="font-code text-sm text-bone">
              {address ? (
                <span className="flex items-center gap-2">
                  {address.slice(0, 6)}…{address.slice(-4)}
                  <span
                    className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                      !wrongChain ? "border-moss/50 text-moss" : "border-magma/50 text-magma"
                    }`}
                  >
                    chain {wallet.chainId ?? "?"}
                  </span>
                </span>
              ) : (
                <span className="text-ash">not connected</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border border-slate/60 bg-obsidian/40 px-3 py-2 sm:flex-col sm:items-start">
            <dt className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">Vault</dt>
            <dd className="break-all font-code text-xs text-ash">{VAULT_ADDRESS}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border border-slate/60 bg-obsidian/40 px-3 py-2 sm:flex-col sm:items-start">
            <dt className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">Total weight</dt>
            <dd className="font-code text-sm text-gold">
              {totalWeight === null ? "…" : totalWeight.toString()}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!address ? (
            <>
              <button
                className={wallet.hasInjected ? "btn-ember px-6 py-3 text-sm" : "btn-ghost px-5 py-3 text-xs"}
                onClick={() => wallet.connect().catch((e) => setError(e.message))}
              >
                Connect wallet
              </button>
              <button
                className={wallet.hasInjected ? "btn-ghost px-5 py-3 text-xs" : "btn-ember px-6 py-3 text-sm"}
                onClick={() => wallet.connectWalletConnect().catch((e) => setError(e.message))}
                disabled={!wallet.wcEnabled}
              >
                WalletConnect (QR)
              </button>
            </>
          ) : wrongChain ? (
            <button className="btn-ember px-6 py-3 text-sm" onClick={() => wallet.switchToChain()}>
              Switch to Robinhood Chain
            </button>
          ) : scanning ? (
            <span className="font-code text-xs text-ash">
              Loading your cards…{scanProgress > 0 ? ` (${scanProgress})` : ""}
            </span>
          ) : (
            <span className="font-code text-xs text-ash">
              {availableCards.length} card(s) in wallet
            </span>
          )}
        </div>
      </Panel>

      <Panel kicker="Stake a Card" className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">Lock duration</p>
          <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
            Tap a seal to choose · longer lock = bigger weight
          </p>
        </div>

        {/* Tier seals — 6 tap-to-choose tiles (snap-scroll on mobile) */}
        <div className="mt-3 flex snap-x gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-6">
          {tiers.map((t) => {
            const sel = selectedTier === t.id;
            const mult = weightMultiplier(t.weightX1000);
            const pct = Math.max(6, Math.round((Number(t.weightX1000) / Number(maxWeight)) * 100));
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={sel}
                onClick={() => setSelectedTier(t.id)}
                className={`group relative flex min-w-[96px] snap-start flex-col items-start gap-2 border p-3 text-left transition-all duration-200 ${
                  sel
                    ? "-translate-y-1 border-ember bg-ember/10 shadow-[0_10px_30px_-12px_var(--color-ember)]"
                    : "border-slate/70 bg-obsidian/40 hover:-translate-y-0.5 hover:border-ember/60"
                }`}
              >
                <span className="font-code text-[9px] uppercase tracking-[0.16em] text-ash">
                  {t.lockSeconds <= 0n ? "no lock" : `tier ${t.id}`}
                </span>
                <span className="font-display text-2xl font-bold leading-none text-bone">
                  {shortLock(t.lockSeconds)}
                </span>
                <span className={`font-code text-xs ${sel ? "text-ember" : "text-gold"}`}>
                  ×{mult.toFixed(0)}
                </span>
                <span className="relative h-1.5 w-full overflow-hidden rounded-[1px] bg-slate/60">
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg,var(--color-ember),var(--color-gold))",
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Live payoff for the selected seal */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate/50 pt-4 sm:grid-cols-4">
          <PayoffCell label="Lock" value={selTier ? shortLock(selTier.lockSeconds) : "…"} />
          <PayoffCell label="Unlocks" value={selTier ? formatUnlockDate(selTier.lockSeconds) : "…"} accent />
          <PayoffCell
            label="Weight"
            value={selTier ? `×${weightMultiplier(selTier.weightX1000).toFixed(1)}` : "…"}
          />
          <PayoffCell
            label="vs flexible"
            value={selTier ? `${weightMultiplier(selTier.weightX1000).toFixed(0)}× rewards` : "…"}
          />
        </div>

        {address && availableCards.length > 0 && (
          <>
            <p className="mt-5 text-sm text-ash">
              Tap cards to select for batch staking ({selectedIds.length} selected) — one
              transaction for the whole batch, all at the chosen tier.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className="btn-ghost px-5 py-2 text-xs"
                onClick={() => setSelectedIds([...availableCards])}
                disabled={busy || selectedIds.length === availableCards.length}
              >
                Select all ({availableCards.length})
              </button>
              <button
                className="btn-ghost px-5 py-2 text-xs"
                onClick={() => setSelectedIds([])}
                disabled={busy || selectedIds.length === 0}
              >
                Clear selection
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {availableCards.map((id) => {
                const on = selectedIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 border p-2 transition-colors ${
                      on ? "border-ember bg-ember/10" : "border-slate/70 hover:border-ember/60"
                    }`}
                    onClick={() => toggleCard(id)}
                    title={on ? "Deselect" : "Select for batch stake"}
                    aria-pressed={on}
                  >
                    <CardThumb id={id} size={40} />
                    <span className="font-code text-[10px] uppercase tracking-[0.1em] text-bone">
                      #{id}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedIds.length > 0 && (
              <div className="mt-4">
                <button
                  className="btn-ember px-6 py-3 text-sm"
                  onClick={() => stakeBatch()}
                  disabled={busy || !address || wrongChain}
                >
                  {busy
                    ? "Working…"
                    : `Stake selected (${selectedIds.length}) · ${selLabel}`}
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="token id (manual)"
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value.trim())}
            className="w-52 border border-slate bg-obsidian/60 px-3 py-2 font-code text-sm text-bone outline-none placeholder:text-ash/60 focus:border-ember"
          />
          {activeTokenId !== null && <CardThumb id={activeTokenId} size={40} />}
        </div>

        <div className="mt-4">
          <button
            className="btn-ember px-6 py-3 text-sm"
            onClick={() => activeTokenId !== null && stake(activeTokenId)}
            disabled={busy || activeTokenId === null || !address || wrongChain}
          >
            {busy ? "Working…" : activeTokenId !== null ? `Stake #${activeTokenId} (${selLabel})` : "Stake"}
          </button>
        </div>
      </Panel>

      {address && myStakes && myStakes.length > 0 && (
        <Panel kicker="My Stakes" className="mt-4">
          <div className="flex flex-wrap gap-3">
            <button className="btn-ghost px-5 py-2 text-xs" onClick={() => claimAll()} disabled={busy}>
              Claim all ({myStakes.length})
            </button>
            <button className="btn-ghost px-5 py-2 text-xs" onClick={() => unstakeReady()} disabled={busy}>
              Unstake ready
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate/70 font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                  <th className="py-2 pr-4 font-normal">Card</th>
                  <th className="py-2 pr-4 font-normal">Tier</th>
                  <th className="py-2 pr-4 font-normal">Weight</th>
                  <th className="py-2 pr-4 font-normal">Pending</th>
                  <th className="py-2 font-normal" />
                </tr>
              </thead>
              <tbody>
                {myStakes.map((row) => (
                  <tr key={row.tokenId.toString()} className="border-b border-slate/40">
                    <td className="py-2 pr-4 font-code text-bone">#{row.tokenId.toString()}</td>
                    <td className="py-2 pr-4 text-bone">{tierLabel(row.tier)}</td>
                    <td className="py-2 pr-4 font-code text-ash">{weightLabel(row.weight)}</td>
                    <td className="py-2 pr-4 font-code text-gold">{formatUsdc(row.pending)}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          className="border border-slate px-2.5 py-1 font-code text-[10px] uppercase tracking-[0.1em] text-bone transition-colors hover:border-ember hover:text-ember"
                          onClick={() => claim(row.tokenId)}
                          disabled={busy}
                        >
                          claim
                        </button>
                        <button
                          className="border border-slate px-2.5 py-1 font-code text-[10px] uppercase tracking-[0.1em] text-bone transition-colors hover:border-ember hover:text-ember"
                          onClick={() => unstake(row.tokenId)}
                          disabled={busy}
                        >
                          unstake
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {(status || error || txHash) && (
        <div className="mt-4 space-y-2">
          {status && !error && (
            <div className="border border-moss/50 bg-moss/10 px-4 py-3 font-code text-xs text-moss">
              {status}
            </div>
          )}
          {error && (
            <div className="border border-magma/50 bg-magma/10 px-4 py-3 font-code text-xs text-magma">
              {error}
            </div>
          )}
          {txHash && (
            <div className="border border-slate bg-obsidian/50 px-4 py-3 font-code text-xs text-ash">
              tx:{" "}
              <a
                href={explorerUrl(`tx/${txHash}`)}
                target="_blank"
                rel="noreferrer"
                className="text-ember hover:underline"
              >
                {txHash}
              </a>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
