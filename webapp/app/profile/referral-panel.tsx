"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseGwei,
  type Address,
} from "viem";
import { rhChain, RH_RPC_URL, explorerUrl } from "@/lib/rh-chain";
import { rpcFetch } from "@/lib/rpc";
import { CORE_ADDRESS, PROOF_OF_CARD_ABI } from "@/lib/poc";
import { useEthWallet } from "@/lib/useEthWallet";
import { clearStoredRef, getStoredRef, inviteLink, shortAddress } from "@/lib/referral";
import { Panel } from "../spirit/ui";
import { IconX, IconTelegram } from "../spirit/icons";

const publicClient = createPublicClient({
  chain: rhChain,
  transport: http(RH_RPC_URL, { timeout: 8_000, fetchFn: rpcFetch(2) }),
});

const FEE_FLOOR_GWEI = Math.max(1, Number(process.env.NEXT_PUBLIC_MIN_MAX_FEE_GWEI ?? "1") || 1);
const ZERO = "0x0000000000000000000000000000000000000000";

type Wallet = ReturnType<typeof useEthWallet>;

function humanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied/i.test(msg)) return "Transaction rejected in the wallet.";
  if (/REF_NO_MINT/i.test(msg)) return "Your inviter must mint at least one card before you can bind them.";
  if (/SELF/i.test(msg)) return "You can't bind your own link — share it with friends instead.";
  if (/SET/i.test(msg)) return "You already have a referrer — binding is permanent.";
  if (/NOTHING/i.test(msg)) return "Nothing to claim yet.";
  return msg.length > 160 ? "Transaction failed — please try again." : msg;
}

function prettyEth(v: bigint): string {
  const n = Number(formatEther(v));
  if (!Number.isFinite(n)) return "0";
  return n === 0 ? "0" : n.toFixed(6);
}

/**
 * Referral hub (profile page) — best-practice set:
 * prominent placement, one personal link with copy + share, live earnings with
 * one-click claim, binding status, 3-step explainer and honest fine print.
 */
export function ReferralPanel({ wallet, address }: { wallet: Wallet; address: Address }) {
  const [referrer, setReferrer] = useState<Address | null>(null);
  const [earned, setEarned] = useState<bigint | null>(null);
  const [stored, setStored] = useState<Address | null>(null);
  const [busy, setBusy] = useState<"bind" | "claim" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tx, setTx] = useState<string | null>(null);

  const load = useCallback(async (who: Address) => {
    setStored(getStoredRef());
    try {
      const [ref, earnedAmt] = await Promise.all([
        publicClient.readContract({
          address: CORE_ADDRESS,
          abi: PROOF_OF_CARD_ABI,
          functionName: "referrerOf",
          args: [who],
        }) as Promise<Address>,
        publicClient.readContract({
          address: CORE_ADDRESS,
          abi: PROOF_OF_CARD_ABI,
          functionName: "referralEarned",
          args: [who],
        }) as Promise<bigint>,
      ]);
      setReferrer(ref === ZERO ? null : ref);
      setEarned(earnedAmt);
    } catch (e) {
      setError(humanError(e));
    }
  }, []);

  useEffect(() => {
    void load(address);
  }, [address, load]);

  const link = inviteLink(address);
  const shareText = "Mining Spirit Cards on Robinhood Chain — collectible cards earned by real proof-of-work. Join me:";
  const xShare = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(link)}`;
  const tgShare = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [link]);

  const send = useCallback(
    async (fn: "bind" | "claim") => {
      setError(null);
      setNotice(null);
      const provider = wallet.activeProvider();
      if (!provider || !address) {
        setError("Connect your wallet first.");
        return;
      }
      if (wallet.wrongChain) {
        await wallet.switchToChain();
        return;
      }
      const bindTo = stored;
      if (fn === "bind" && !bindTo) {
        setError("No invite link found in this browser to bind.");
        return;
      }
      setBusy(fn);
      try {
        let maxFeePerGas = parseGwei(String(FEE_FLOOR_GWEI));
        try {
          const block = await publicClient.getBlock({ blockTag: "latest" });
          const twice = (block.baseFeePerGas ?? 0n) * 2n;
          if (twice > maxFeePerGas) maxFeePerGas = twice;
        } catch {
          /* keep floor */
        }
        const walletClient = createWalletClient({ chain: rhChain, transport: custom(provider) });
        const hash =
          fn === "bind"
            ? await walletClient.writeContract({
                account: address,
                address: CORE_ADDRESS,
                abi: PROOF_OF_CARD_ABI,
                functionName: "setReferrer",
                args: [bindTo as Address],
                maxFeePerGas,
                maxPriorityFeePerGas: maxFeePerGas / 2n,
              })
            : await walletClient.writeContract({
                account: address,
                address: CORE_ADDRESS,
                abi: PROOF_OF_CARD_ABI,
                functionName: "claimReferral",
                args: [],
                maxFeePerGas,
                maxPriorityFeePerGas: maxFeePerGas / 2n,
              });
        setTx(hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
        if (receipt.status !== "success") throw new Error("Transaction reverted.");
        if (fn === "bind") {
          setNotice("Referrer bound — this is permanent. Their 7% is now active for every payment you make.");
          clearStoredRef();
        } else {
          setNotice("Claimed — the ETH is in your wallet.");
        }
        await load(address);
      } catch (e) {
        setError(humanError(e));
      } finally {
        setBusy(null);
      }
    },
    [address, load, stored, wallet],
  );

  const selfRef = !!stored && stored.toLowerCase() === address.toLowerCase();
  const canBind = !referrer && !!stored && !selfRef;

  return (
    <Panel kicker="Referral · 推荐好友">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-bone">
            Invite friends — <span className="text-ember">earn 7%</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ash">
            Every time someone you invited <span className="text-bone">mines, merges or buys a pack</span>,{" "}
            <span className="text-bone">7% of their payment</span> accrues to you on-chain. Claim it any time —
            no limits, no tiers. One link, bound forever.
          </p>
        </div>

        <div className="rounded-[2px] border border-ember/40 bg-ember/5 p-3">
          <p className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">Your invite link</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <code className="min-w-0 flex-1 truncate border border-slate/60 bg-obsidian px-3 py-2 font-code text-[11px] text-gold">
              {link}
            </code>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ember px-5 py-2.5 text-xs" onClick={copyLink}>
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <a
                className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2.5 text-xs"
                href={xShare}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconX size={13} />
                Share
              </a>
              <a
                className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2.5 text-xs"
                href={tgShare}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconTelegram size={13} />
                Telegram
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="panel-flat px-4 py-3">
            <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">You earn</p>
            <p className="mt-1 font-code text-2xl font-bold text-ember">7%</p>
            <p className="mt-1 text-[11px] leading-snug text-ash">of every payment from your invitees</p>
          </div>
          <div className="panel-flat px-4 py-3">
            <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">Earned so far</p>
            <p className="mt-1 font-code text-2xl font-bold text-bone">
              {earned === null ? "…" : prettyEth(earned)}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-ash">ETH, claimable any time</p>
          </div>
          <div className="panel-flat px-4 py-3">
            <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">Binding</p>
            <p className="mt-1 font-code text-2xl font-bold text-bone">1×</p>
            <p className="mt-1 text-[11px] leading-snug text-ash">one-time and permanent, on-chain</p>
          </div>
        </div>

        <div className="border-t border-slate/60 pt-4">
          <p className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">Your referrer</p>
          {referrer ? (
            <p className="mt-2 text-sm text-bone">
              Bound to <span className="font-code text-gold">{shortAddress(referrer)}</span> — permanent. They
              earn 7% of your activity.
            </p>
          ) : canBind ? (
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-ash">
                You followed an invite from <span className="font-code text-gold">{shortAddress(stored!)}</span>.
                Bind it to activate their rewards (they must have minted ≥ 1 card).
              </p>
              <button
                type="button"
                className="btn-ember px-5 py-2.5 text-xs disabled:opacity-40"
                disabled={busy !== null}
                onClick={() => void send("bind")}
              >
                {busy === "bind" ? "Binding…" : `Bind ${shortAddress(stored!)}`}
              </button>
            </div>
          ) : selfRef ? (
            <p className="mt-2 text-sm text-ash">
              The link you came through is your own — share it with friends instead.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ash">
              None yet. When a friend shares their invite link, open it once — it will appear here for binding.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-[2px] border border-gold/30 bg-gold/5 p-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-ash">
            Accrued rewards:{" "}
            <span className="font-code text-bone">{earned === null ? "…" : `${prettyEth(earned)} ETH`}</span>
          </p>
          <button
            type="button"
            className="btn-ember px-5 py-2.5 text-xs disabled:opacity-40"
            disabled={busy !== null || !earned || earned === 0n}
            onClick={() => void send("claim")}
          >
            {busy === "claim" ? "Claiming…" : "Claim rewards"}
          </button>
        </div>

        <ol className="grid grid-cols-1 gap-2 text-xs text-ash sm:grid-cols-3">
          <li className="border border-slate/60 px-3 py-2">
            <span className="text-ember">1 ·</span> Share your link
          </li>
          <li className="border border-slate/60 px-3 py-2">
            <span className="text-ember">2 ·</span> Friend opens it &amp; binds you
          </li>
          <li className="border border-slate/60 px-3 py-2">
            <span className="text-ember">3 ·</span> You earn 7% of their activity
          </li>
        </ol>

        <p className="font-code text-[10px] leading-relaxed text-ash/80">
          On-chain referral: a % of activity (mine / merge / packs) — not of deposits, staking or battle rake.
          Binding is one-time and permanent; the inviter must have minted at least one card. Claims are
          pull-based — ETH goes straight to your wallet.
        </p>

        {notice && (
          <div className="border border-gold/50 bg-gold/10 px-4 py-3 font-code text-[11px] leading-relaxed text-gold">
            {notice}
          </div>
        )}
        {error && (
          <div className="border border-magma/50 bg-magma/10 px-4 py-3 font-code text-[11px] leading-relaxed text-magma">
            {error}
          </div>
        )}
        {tx && (
          <a
            className="font-code text-[11px] text-ember underline-offset-2 hover:underline"
            href={explorerUrl(`tx/${tx}`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction ↗
          </a>
        )}
      </div>
    </Panel>
  );
}
