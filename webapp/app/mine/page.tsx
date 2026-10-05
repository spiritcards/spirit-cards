"use client";

import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, parseGwei, type Hex } from "viem";
import { rhChain, explorerUrl } from "@/lib/rh-chain";
import { getPublicClient, PACKS_ADDRESS, PACKS_ABI } from "@/lib/poc";
import { RH_CHAIN_ID } from "@/lib/contract";
import { formatUsdc, shortAddress } from "@/lib/format";
import { OPENSEA_URL } from "@/lib/site";
import { imageQuery } from "@/lib/traits-set";
import { formatAttempts, formatRate } from "@/lib/miner-client";
import { useEthWallet } from "@/lib/useEthWallet";
import { useMining } from "@/lib/useMining";
import { useLang } from "@/lib/lang";
import { Panel, PageHero, StatPill } from "../spirit/ui";
import { BrandLogo } from "../spirit/icons";
import LiveFeed from "../live-feed";
import { PackOpener } from "./pack-opener";
import { decodeConfirmedPack, PACK_SIZES, type PackReveal } from "./pack-open-event";

const FEE_FLOOR_GWEI = Math.max(1, Number(process.env.NEXT_PUBLIC_MIN_MAX_FEE_GWEI ?? "1") || 1);

const publicClient = getPublicClient();

/** Packs — sold inside MINE. Sizes and increasing discount (economy TBD). */
const PACKS = [
  { size: 5, discount: 3 },
  { size: 10, discount: 6 },
  { size: 25, discount: 12 },
  { size: 50, discount: 20 },
  { size: 100, discount: 30 },
] as const;

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 bg-[linear-gradient(180deg,#ff7d52,#ff6a3d_45%,#d94f26)]! text-[#1a0d07]! border! border-[#ff9468]! shadow-none! px-5! py-3! font-display text-sm font-bold uppercase tracking-[0.06em] rounded-none! min-h-0! hover:transform-none! hover:shadow-[0_16px_34px_rgba(255,106,61,0.4)]! cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 bg-transparent! text-bone! border! border-slate! shadow-none! px-4! py-2.5! font-display text-xs font-semibold uppercase tracking-[0.06em] rounded-none! min-h-0! hover:border-ember! hover:transform-none! hover:shadow-none! cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

const barPct = (part: bigint, whole: bigint): number =>
  whole > 0n ? Number((part * 10_000n) / whole) / 100 : 0;

/** One compact stat tile. */
function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border border-slate/70 bg-obsidian/40 px-2.5 py-2">
      <div className="font-code text-[9px] uppercase tracking-[0.14em] text-ash">{label}</div>
      <div className={`mt-0.5 font-code text-sm ${accent ?? "text-bone"}`}>{value}</div>
    </div>
  );
}

export default function MinePage() {
  const wallet = useEthWallet();
  const { address, chainId, wrongChain } = wallet;
  const { state, engine } = useMining();
  const { stats } = state;
  const { t } = useLang();

  const [packBusy, setPackBusy] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  // Confirmed pack result → reveal overlay (presentation only; never re-charges).
  const [reveal, setReveal] = useState<(PackReveal & { transactionHash: Hex }) | null>(null);
  const [packNotice, setPackNotice] = useState("");

  const activeProvider = wallet.activeProvider;

  // Keep the (process-wide) engine pointed at the current wallet + chain.
  useEffect(() => {
    engine.setWallet(address, activeProvider());
  }, [address, activeProvider, engine]);

  // Refresh chain stats periodically while the page is open.
  useEffect(() => {
    const statsTimer = setInterval(() => void engine.refreshStats(), 15_000);
    return () => clearInterval(statsTimer);
  }, [engine]);

  const buyPack = useCallback(
    async (i: number) => {
      setPackError(null);
      const provider = wallet.activeProvider();
      if (!provider || !address) {
        setPackError("Connect your wallet first.");
        return;
      }
      if (wrongChain) {
        await wallet.switchToChain();
        return;
      }
      setPackBusy(true);
      const requestedSize = PACK_SIZES[i];
      const buyer = address;
      try {
        let maxFeePerGas = parseGwei(String(FEE_FLOOR_GWEI));
        try {
          const block = await publicClient.getBlock({ blockTag: "latest" });
          const twice = (block.baseFeePerGas ?? 0n) * 2n;
          if (twice > maxFeePerGas) maxFeePerGas = twice;
        } catch {
          /* keep floor */
        }
        const price = (await publicClient.readContract({
          address: PACKS_ADDRESS,
          abi: PACKS_ABI,
          functionName: "priceFor",
          args: [BigInt(i)],
        })) as bigint;
        const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
        const hash = await walletClient.writeContract({
          account: address,
          address: PACKS_ADDRESS,
          abi: PACKS_ABI,
          functionName: "buyPack",
          args: [BigInt(i)],
          value: price,
          maxFeePerGas,
          maxPriorityFeePerGas: maxFeePerGas / 2n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
        if (receipt.status === "success" && requestedSize !== undefined) {
          const decoded = decodeConfirmedPack(receipt, {
            packsAddress: PACKS_ADDRESS,
            buyer,
            tierIndex: i,
            requestedSize,
          });
          if (decoded.ok) {
            setPackNotice("");
            setReveal({ ...decoded.reveal, transactionHash: receipt.transactionHash });
          } else {
            // Purchase is confirmed — never surface this as a failed purchase.
            setPackNotice("Purchase confirmed. View your collection to see the cards.");
          }
          // Refresh independently; a stats error must not hide the confirmed result.
          void Promise.resolve()
            .then(() => engine.refreshStats())
            .catch(() => setPackNotice("Purchase confirmed. Collection stats will update after refresh."));
        } else if (receipt.status !== "success") {
          setPackError("buyPack reverted.");
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "buyPack failed";
        setPackError(/user rejected|denied/i.test(message) ? "Transaction rejected in wallet." : message);
      } finally {
        setPackBusy(false);
      }
    },
    [address, wallet, wrongChain, engine],
  );

  const era = stats && stats.eraSize > 0n ? stats.paidMinted / stats.eraSize : 0n;
  const eraPct = stats ? barPct(stats.paidMinted % stats.eraSize, stats.eraSize) : 0;
  const supplyPct = stats ? barPct(stats.totalMinted, stats.maxSupply) : 0;
  const nextPrice = stats ? stats.price + (stats.price * stats.priceStepBps) / 10_000n : 0n;
  const stepPct = stats ? Number(stats.priceStepBps) / 100 : 0;
  const powProgressPct =
    stats && stats.baseBits > 0 ? Math.min(100, Math.round(((state.bestBits ?? 0) / stats.baseBits) * 100)) : 0;

  const cooldownLeft =
    state.cooldownUntil > 0
      ? Math.max(0, state.cooldownUntil - Math.floor(Date.now() / 1000))
      : 0;
  const miningStatusText = state.grinding
    ? `${t.stGrinding} ${formatAttempts(state.attempts)}`
    : state.running && cooldownLeft > 0
      ? `cooldown · ${cooldownLeft}s`
      : state.running
        ? t.stAuto
        : state.workerAvailable === null
          ? t.stCheckingWorker
          : state.workerAvailable
            ? t.stWorkerReady
            : t.stWorkerUnavailable;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker={t.heroKicker}
        title={t.heroTitle}
        image="/spirit/scene-elements.jpg"
        imageAlt="Mine — the elemental collection grinding a fresh Spirit Card"
        icon={<BrandLogo size={18} />}
        subtitle={t.heroSubtitle}
      >
        <StatPill label={t.mintPrice} value={stats ? `${formatUsdc(stats.price)} ETH` : "…"} />
        <StatPill
          label={t.minted}
          value={stats ? `${stats.totalMinted.toString()} / ${stats.maxSupply.toString()}` : "…"}
        />
        <StatPill label={t.chips} value={stats ? stats.chipBalance.toString() : "…"} />
        <a
          href={OPENSEA_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost shrink-0 px-4 py-2 text-[11px]"
        >
          OpenSea ↗
        </a>
      </PageHero>

      <div className="space-y-4">
        {/* ---------------------------------------------------------------- */}
        {/* Mining console — everything for mining in one screen              */}
        {/* ---------------------------------------------------------------- */}
        <Panel kicker={t.consoleKicker}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">{t.mintPrice}</div>
              <div className="font-code text-3xl font-bold text-gold">
                {stats ? `${formatUsdc(stats.price)} ETH` : "…"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                {t.nextWave} · #{stats ? (era + 1n).toString() : "…"}
              </div>
              <div className="font-code text-sm text-bone">
                {stats ? `${formatUsdc(nextPrice)} ETH ` : "…"}
                <span className="text-moss">+{stepPct}%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">{t.waveProgress}</span>
                <span className="font-code text-[11px] text-ash">{stats ? `${eraPct}%` : "…"}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-[1px] bg-slate/50">
                <div
                  className="h-full bg-[linear-gradient(90deg,var(--color-ember),var(--color-gold))] transition-[width] duration-500"
                  style={{ width: `${eraPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">{t.collectionProgress}</span>
                <span className="font-code text-[11px] text-ash">
                  {stats ? `${stats.totalMinted.toString()} / ${stats.maxSupply.toString()}` : "…"}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-[1px] bg-slate/50">
                <div
                  className="h-full bg-[linear-gradient(90deg,var(--color-tide),var(--color-celestial))] transition-[width] duration-500"
                  style={{ width: `${supplyPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={t.baseBits} value={stats ? String(stats.baseBits) : "…"} accent="text-ember" />
            <Tile label={t.cooldown} value={stats ? `${stats.mineCooldown.toString()}s` : "…"} />
            <Tile label={t.minted} value={stats ? stats.totalMinted.toString() : "…"} />
            <Tile label={t.chipDisc} value={stats ? `${Number(stats.chipDiscountBps) / 100}%` : "…"} accent="text-gold" />
            <Tile label={t.hashes} value={formatAttempts(state.attempts)} />
            <Tile label={t.rate} value={formatRate(state.hashRate)} />
            <Tile label={t.elapsed} value={state.running || state.grinding ? formatElapsed(state.elapsedMs) : "—"} />
            <Tile
              label={t.bestBits}
              value={state.bestBits === null ? "—" : `${state.bestBits} / ${stats?.baseBits ?? "?"}`}
              accent="text-ember"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">{t.powProgress}</span>
              <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">{miningStatusText}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-[1px] bg-slate/50">
              <div
                className="h-full bg-[linear-gradient(90deg,var(--color-ember),var(--color-gold))] transition-[width] duration-300"
                style={{ width: `${powProgressPct}%` }}
              />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={state.useChip}
              disabled={!stats || stats.chipBalance === 0n}
              onChange={(e) => engine.setChip(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-ember)] cursor-pointer"
            />
            <span className="text-sm text-ash">
              {t.useChip} (−{(Number(stats?.chipDiscountBps ?? 0n) / 100).toFixed(2)}%, {t.balance}{" "}
              {stats ? stats.chipBalance.toString() : "…"}) ·{" "}
              {state.useChip && stats && stats.chipBalance > 0n
                ? `${t.paying} ${formatUsdc((stats.price * (10000n - stats.chipDiscountBps)) / 10000n)} ETH`
                : `${t.paying} ${stats ? formatUsdc(stats.price) : "…"} ETH`}
            </span>
          </label>

          <div className="mt-7 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={state.running ? () => engine.stop() : () => void engine.start()}
              disabled={!state.running && (!address || wrongChain || state.workerAvailable === false)}
              className="btn-ember w-full max-w-[300px] justify-center px-8 py-6 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex flex-col items-center leading-none">
                <span className="font-display text-2xl font-bold uppercase tracking-[0.08em]">
                  {state.running ? t.btnStop : t.btnMine}
                </span>
                <span className="mt-1.5 block break-all font-code text-[11px] leading-snug tracking-[0.06em] opacity-80">
                  {state.busy ? t.stMinting : state.running ? (state.grinding ? t.stGrinding : t.stAuto) : t.stReady}
                </span>
              </span>
            </button>
            <span className="inline-flex items-center gap-2 border border-slate/70 bg-basalt px-3 py-1 font-code text-[11px] uppercase tracking-[0.2em] text-ash">
              {t.serial} <span className="text-gold">8888</span>
            </span>
          </div>

          {state.status && !state.error && (
            <div className="mt-4 border border-moss/40 bg-moss/10 px-4 py-3 font-code text-[11px] leading-relaxed text-moss">
              {state.status}
            </div>
          )}
          {state.error && (
            <div className="mt-4 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
              {state.error}
            </div>
          )}
          {state.txHash && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border border-slate bg-obsidian/50 px-4 py-3 font-code text-[11px] text-ash">
              tx:{" "}
              <a
                href={explorerUrl(`tx/${state.txHash}`)}
                target="_blank"
                rel="noreferrer"
                className="break-all text-ember! hover:text-ember!"
              >
                {state.txHash}
              </a>
            </div>
          )}
          {state.workerAvailable === false && (
            <div className="mt-4 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
              Miner worker not found at <span className="font-code">/miner/miner-worker.js</span>.
            </div>
          )}
          {stats?.paused && (
            <div className="mt-4 border border-gold/40 bg-gold/10 px-4 py-3 font-code text-[11px] uppercase tracking-[0.08em] text-gold">
              Minting is currently paused.
            </div>
          )}
        </Panel>

        {/* Latest mints strip — lives on the mining tab (everyone's working here). */}
        <LiveFeed />

        {/* ---------------------------------------------------------------- */}
        {/* Packs — right under the live feed (Latest mints)                 */}
        {/* ---------------------------------------------------------------- */}
        <Panel kicker={t.packsTitle}>
          <p className="text-sm text-ash">
            {t.packsDesc}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {PACKS.map((p, i) => (
              <div
                key={p.size}
                className="group flex flex-col items-center border border-slate/70 bg-obsidian/40 p-2.5 transition-colors hover:border-ember/60"
              >
                <img
                  src="/poa/poc/pack-cover.webp"
                  alt={`${p.size}-card pack`}
                  width={128}
                  height={155}
                  loading="lazy"
                  className="h-[155px] w-[128px] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)] transition-transform duration-200 group-hover:-translate-y-1"
                />
                <div className="mt-2.5 font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                  {p.size} {t.cards}
                </div>
                <div className="font-code text-sm text-gold">−{p.discount}%</div>
                <button
                  className={`mt-2 w-full ${BTN_PRIMARY}`}
                  onClick={() => buyPack(i)}
                  disabled={packBusy || !address || wrongChain}
                >
                  {packBusy ? "…" : `${t.buy} ${p.size}`}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ash">
            {t.packsFooter}
          </p>
          {packError && (
            <div className="mt-4 border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
              {packError}
            </div>
          )}
          {packNotice && (
            <p role="status" className="mt-3 font-code text-[11px] leading-relaxed text-gold">
              {packNotice}
            </p>
          )}
          {reveal && (
            <PackOpener
              key={reveal.transactionHash}
              tierIndex={reveal.tierIndex}
              size={reveal.size}
              ids={reveal.ids}
              imageUrl={(id) => `/api/image/${encodeURIComponent(id)}${imageQuery(256)}`}
              onClose={() => setReveal(null)}
              onOpenAnother={() => setReveal(null)}
            />
          )}
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Wallet — connect                                                 */}
        {/* ---------------------------------------------------------------- */}
        <Panel kicker={t.walletTitle}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Tile label={t.wallet} value={address ? shortAddress(address) : t.notConnected} />
            <Tile
              label={t.chain}
              value={`${chainId ?? "—"}${wrongChain ? " (wrong)" : ""}`}
              accent={wrongChain ? "text-magma" : "text-bone"}
            />
            <Tile label={t.price} value={stats ? `${formatUsdc(stats.price)} ETH` : "…"} accent="text-gold" />
            <Tile label={t.chips} value={stats ? stats.chipBalance.toString() : "…"} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!address ? (
              <>
                <button
                  className={wallet.hasInjected ? BTN_PRIMARY : BTN_GHOST}
                  onClick={() => wallet.connect().catch((e) => setPackError(e.message))}
                >
                  {t.connectWallet}
                </button>
                <button
                  className={wallet.hasInjected ? BTN_GHOST : BTN_PRIMARY}
                  onClick={() => wallet.connectWalletConnect().catch((e) => setPackError(e.message))}
                  disabled={!wallet.wcEnabled}
                >
                  {t.wcQr}
                </button>
              </>
            ) : wrongChain ? (
              <button className={BTN_PRIMARY} onClick={() => wallet.switchToChain()}>
                {t.switchChain}
              </button>
            ) : (
              <button className={BTN_GHOST} onClick={() => void engine.refreshStats()}>
                {t.refresh}
              </button>
            )}
          </div>

          {wrongChain && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border border-gold/40 bg-gold/10 px-4 py-3 font-code text-[11px] leading-relaxed text-gold">
              {t.wrongNetwork} {chainId}. {t.expected} {RH_CHAIN_ID}.{" "}
              <button
                className="bg-transparent! border-0! shadow-none! p-0! min-h-0! font-code text-[11px] text-ember! underline cursor-pointer"
                onClick={() => wallet.switchToChain()}
              >
                {t.switchAdd}
              </button>
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
