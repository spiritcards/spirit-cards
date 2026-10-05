"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createWalletClient,
  custom,
  parseGwei,
  parseEventLogs,
  type Address,
} from "viem";
import { rhChain, explorerUrl } from "@/lib/rh-chain";
import {
  getPublicClient,
  CORE_ADDRESS,
  CONFIG_ADDRESS,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
} from "@/lib/poc";
import { formatUsdc } from "@/lib/format";
import { humanizeRpcError } from "@/lib/rpc";
import { sweepOwnedIds } from "@/lib/owned-ids";
import { useEthWallet } from "@/lib/useEthWallet";
import { CardThumb } from "../card-thumb";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { IconMerge } from "../spirit/icons";

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

export default function MergePage() {
  const wallet = useEthWallet();
  const { address, wrongChain } = wallet;

  const [mergeFee, setMergeFee] = useState<bigint | null>(null);
  const [totalMinted, setTotalMinted] = useState(0);
  const [cards, setCards] = useState<number[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [fee, minted] = await Promise.all([
        publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "mergeFee" }),
        publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "totalMinted" }),
      ]);
      setMergeFee(fee);
      setTotalMinted(Number(minted));
    } catch (e) {
      setError(humanizeRpcError(e instanceof Error ? e.message : "Failed to read contract"));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scanMyCards = useCallback(
    async (who: Address) => {
      setScanning(true);
      setCards(null);
      setScanProgress(0);
      try {
        const { owned } = await sweepOwnedIds(publicClient, who, totalMinted, (done) =>
          setScanProgress(done),
        );
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
    setSelected([]);
    if (address && !wrongChain) void scanMyCards(address);
    else setCards(null);
  }, [address, wrongChain, scanMyCards]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const addManual = useCallback(async () => {
    setError(null);
    const trimmed = manual.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError("Token id must be an unsigned integer.");
      return;
    }
    const id = Number(trimmed);
    if (selected.includes(id)) {
      setError(`Card #${id} is already selected.`);
      return;
    }
    if (selected.length >= 2) {
      setError("Two cards are already selected.");
      return;
    }
    if (address) {
      try {
        const owner = await publicClient.readContract({
          address: CORE_ADDRESS,
          abi: PROOF_OF_CARD_ABI,
          functionName: "ownerOf",
          args: [BigInt(id)],
        });
        if (owner.toLowerCase() !== address.toLowerCase()) {
          setError(`You do not own card #${id}.`);
          return;
        }
      } catch {
        setError(`Card #${id} does not exist.`);
        return;
      }
    }
    setSelected((prev) => [...prev, id]);
    setManual("");
  }, [manual, selected, address]);

  const merge = useCallback(async () => {
    setError(null);
    setTxHash(null);
    const provider = wallet.activeProvider();
    if (!provider || !address) {
      setError("Connect your wallet first.");
      return;
    }
    if (selected.length !== 2) {
      setError("Select exactly two different cards.");
      return;
    }
    const [a, b] = selected;
    if (a === b) {
      setError("The two cards must differ.");
      return;
    }
    if (wrongChain) {
      await wallet.switchToChain();
      return;
    }
    setBusy(true);
    try {
      const fee = await publicClient.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: "mergeFee",
      });
      const fees = await computeFees();
      const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
      setStatus(`Sending mergeBurn(${a}, ${b})…`);
      const hash = await walletClient.writeContract({
        account: address,
        address: CORE_ADDRESS,
        abi: PROOF_OF_CARD_ABI,
        functionName: "mergeBurn",
        args: [BigInt(a), BigInt(b)],
        value: fee,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      setTxHash(hash);
      setStatus("mergeBurn submitted. Waiting for receipt…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status === "success") {
        const [merged] = parseEventLogs({
          abi: PROOF_OF_CARD_ABI,
          eventName: "Merged",
          logs: receipt.logs,
        });
        const child = merged ? (merged.args as { child?: bigint }).child : undefined;
        setStatus(
          child !== undefined
            ? `Merged — child #${child.toString()} forged (block ${receipt.blockNumber}).`
            : `Merged (block ${receipt.blockNumber}).`,
        );
        setSelected([]);
        setCards(null);
      } else {
        setError("mergeBurn reverted on-chain.");
        setStatus("");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "merge failed";
      setError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }, [wallet, address, selected, wrongChain]);

  const availableCards = useMemo(() => cards ?? [], [cards]);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Merge 熔"
        title="Merge"
        image="/spirit/scene-elements.jpg"
        position="object-right"
        imageAlt="Merge — two elemental Spirit Cards forging into one evolved child"
        icon={<IconMerge size={18} />}
        subtitle="Burn two cards you own (a + b) into one forged child in a single on-chain transaction. The merge is irreversible — both parents burn and the evolved child is forged atomically."
      >
        <StatPill
          label="Merge fee"
          value={mergeFee === null ? "…" : `${formatUsdc(mergeFee)} ETH`}
        />
        <StatPill label="Your cards" value={String(availableCards.length)} />
      </PageHero>

      <div className="space-y-4">
        <Panel kicker="Wallet">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-slate/60 pb-3 font-code text-[12px]">
              <span className="uppercase tracking-[0.14em] text-ash">Wallet</span>
              <span className="text-right text-bone">
                {address ? (
                  <>
                    {address.slice(0, 6)}…{address.slice(-4)}{" "}
                    <span
                      className={`ml-1 inline-block border px-2 py-[2px] font-code text-[10px] uppercase tracking-[0.14em] ${
                        !wrongChain ? "border-moss/50 text-moss" : "border-magma/50 text-magma"
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
            <div className="flex items-center justify-between gap-4 font-code text-[12px]">
              <span className="uppercase tracking-[0.14em] text-ash">Merge fee</span>
              <span className="text-gold">
                {mergeFee === null ? "…" : `${formatUsdc(mergeFee)} ETH`}
              </span>
            </div>
          </div>

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
            ) : wrongChain ? (
              <button className="btn-ember px-5 py-2.5 text-xs" onClick={() => wallet.switchToChain()}>
                Switch to Robinhood Chain
              </button>
            ) : scanning ? (
              <span className="font-code text-[11px] uppercase tracking-[0.14em] text-ash">
                Loading your cards…{scanProgress > 0 ? ` (${scanProgress})` : ""}
              </span>
            ) : (
              <span className="font-code text-[11px] uppercase tracking-[0.14em] text-ash">
                {availableCards.length} card(s) in wallet
              </span>
            )}
          </div>
        </Panel>

        <Panel kicker="Select Two Cards">
          {address && availableCards.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {availableCards.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`flex flex-col items-center gap-1 border p-1.5 transition-colors ${
                    selected.includes(id)
                      ? "border-ember bg-ember/10"
                      : "border-slate/70 bg-obsidian/40 hover:border-ember/60"
                  }`}
                  onClick={() => toggle(id)}
                >
                  <CardThumb id={id} size={40} />
                  <span className="font-code text-[10px] text-ash">#{id}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="token id (manual)"
              value={manual}
              onChange={(e) => setManual(e.target.value.trim())}
              className="min-w-[180px] flex-1 border border-slate bg-obsidian/60 px-3 py-2 font-code text-sm text-bone placeholder:text-ash/50 outline-none focus:border-ember"
            />
            <button
              className="btn-ghost px-4 py-2 text-xs disabled:opacity-40"
              onClick={addManual}
              disabled={!address || !manual || wrongChain}
            >
              Add card
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate/60 pt-4">
            <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">Selected</span>
            <span className="flex flex-wrap items-center gap-2">
              {selected.length === 0 ? (
                <span className="font-code text-[12px] text-ash/70">none</span>
              ) : (
                selected.map((id, i) => (
                  <button
                    key={id}
                    type="button"
                    className="flex items-center gap-2 border border-ember bg-ember/10 px-2 py-1 font-code text-[11px] text-bone"
                    onClick={() => toggle(id)}
                  >
                    <CardThumb id={id} size={28} />
                    {i === 0 ? "a" : "b"} #{id} ✕
                  </button>
                ))
              )}
            </span>
          </div>
        </Panel>

        <Panel kicker="Forge">
          <button
            className="btn-ember w-full justify-center px-6 py-3 text-sm disabled:opacity-40 disabled:hover:translate-y-0"
            onClick={merge}
            disabled={busy || selected.length !== 2 || !address || wrongChain}
          >
            {busy ? "Working…" : selected.length !== 2 ? "Select two cards" : "Merge"}
          </button>

          <div className="mt-5 space-y-3">
            <div className="border border-gold/40 bg-gold/10 px-4 py-3 font-code text-[11px] uppercase leading-relaxed tracking-[0.08em] text-gold">
              Merging is irreversible: both cards are burned and the child is forged atomically.
            </div>
            {status && !error && (
              <div className="border border-moss/40 bg-moss/10 px-4 py-3 font-code text-[11px] leading-relaxed text-moss">
                {status}
              </div>
            )}
            {error && (
              <div className="border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
                {error}
              </div>
            )}
            {txHash && (
              <div className="flex flex-wrap items-center gap-2 border border-slate bg-obsidian/50 px-4 py-3 font-code text-[11px] text-ash">
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
        </Panel>
      </div>

      <p className="mt-6">
        <Link
          href="/docs"
          className="font-code text-[11px] uppercase tracking-[0.14em] text-ember hover:underline"
        >
          Read the docs →
        </Link>
      </p>
    </main>
  );
}
