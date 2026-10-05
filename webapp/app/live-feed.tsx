"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { formatEther } from "viem";
import { imageQuery } from "@/lib/traits-set";
import { useI18n } from "@/lib/locale";

/**
 * Live claims, mints & packs strip — polls /api/recent (RPC-backed, server-
 * cached) every 20s and renders the latest events as a single horizontal row of
 * card thumbnails. Covers MINE mints, PACK purchases and the cards a pack drops.
 * Oldest first, so fresh events land on the right end; the row sticks to its
 * right end — once it overflows the band, the leftmost (oldest) card slides out
 * of view.
 */

type RecentEvent = {
  kind: "claim" | "mint" | "pack";
  tokenId: number;
  miner: string;
  codeHash?: string;
  bits?: number;
  paid?: string;
  size?: number;
  label?: string;
  txHash: string;
  timestamp: string;
};

const POLL_MS = 10_000;

function shortAddress(address: string): string {
  if (!address || address.length < 12) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function tokenLabel(id: number): string {
  return `#${id}`;
}

/** wei → compact "0.0015 ETH" label (empty on garbage). */
function formatEth(wei: string | undefined): string {
  if (wei === undefined) return "";
  try {
    const e = formatEther(BigInt(wei));
    const trimmed = e.includes(".") ? e.replace(/0+$/, "").replace(/\.$/, "") : e;
    return `${trimmed} ETH`;
  } catch {
    return "";
  }
}

export default function LiveFeed() {
  const { t } = useI18n();
  const [events, setEvents] = useState<RecentEvent[] | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  // Localized relative-time label; localized so it follows the active /zh tree.
  function timeAgo(iso: string): string {
    if (!iso) return "";
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < 0) return t.home.live.justNow;
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 1) return t.home.live.justNow;
    if (minutes < 60) return t.home.live.minutesAgo(minutes);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t.home.live.hoursAgo(hours);
    const days = Math.floor(hours / 24);
    return t.home.live.daysAgo(days);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/recent", { cache: "no-store" });
        const json = (await response.json()) as { events?: RecentEvent[] };
        if (!cancelled) setEvents(json.events ?? []);
      } catch {
        if (!cancelled) setEvents((previous) => previous ?? []);
      }
    }

    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // /api/recent returns newest-first; flip it so the row reads left → right in
  // chronological order and new events appear on the right edge.
  const rendered = useMemo(() => [...(events ?? [])].reverse(), [events]);

  // Follow the tail: keep the right end (freshest cards) in view. Older cards
  // drift off the left edge once the row is wider than the band.
  useEffect(() => {
    const node = stripRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [rendered]);

  return (
    <section
      className="panel-flat angler mt-5 px-5 py-4"
      aria-label={t.home.live.aria}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="kicker inline-flex items-center gap-2.5">
          <span
            className="inline-block h-2 w-2 shrink-0 animate-pulse bg-moss shadow-[0_0_0_4px_rgba(111,168,96,0.16)] motion-reduce:animate-none"
            aria-hidden="true"
          />
          {`// ${t.home.live.title}`}
        </span>
        {rendered.length > 0 && (
          <span className="font-code text-[10px] uppercase tracking-[0.06em] text-ash">
            {t.home.live.count(rendered.length)}
          </span>
        )}
      </div>

      {events === null ? (
        <div className="mt-3 font-code text-xs text-ash">{t.home.live.loading}</div>
      ) : rendered.length === 0 ? (
        <div className="mt-3 font-code text-xs text-ash">{t.home.live.empty}</div>
      ) : (
        <div
          className="mt-3 flex flex-nowrap gap-x-4 gap-y-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={stripRef}
        >
          {rendered.map((event) => {
            const isPack = event.kind === "pack";
            const badge =
              event.kind === "claim"
                ? t.home.live.kindClaim
                : event.kind === "mint"
                  ? t.home.live.kindMint
                  : t.home.live.kindPack;
            const badgeColor =
              event.kind === "claim"
                ? "text-tide"
                : event.kind === "mint"
                  ? "text-moss"
                  : "text-gold";
            const main = isPack ? (event.label ?? `×${event.size ?? "?"}`) : tokenLabel(event.tokenId);
            return (
              <a
                className="flex flex-none items-center gap-2.5 whitespace-nowrap font-code text-xs text-bone"
                key={`${event.txHash}-${event.tokenId}-${event.kind}`}
                href={isPack ? "/mine" : `/token/${event.tokenId}`}
                title={`${event.txHash} · ${event.timestamp}`}
              >
                <Image
                  className="block h-14 w-14 flex-none border border-slate object-cover"
                  src={`/api/image/${event.tokenId}${imageQuery(112)}`}
                  alt={`Card ${tokenLabel(event.tokenId)}`}
                  width={56}
                  height={56}
                />
                <span className="inline-flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`border border-current px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.07em] ${badgeColor}`}
                    >
                      {badge}
                    </span>
                    <span className="font-semibold">{main}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className="text-ash">{shortAddress(event.miner)}</span>
                    {event.kind === "mint" && event.bits !== undefined && (
                      <span className="text-ash">{event.bits} bits</span>
                    )}
                    {isPack && event.paid !== undefined && (
                      <span className="text-ash">{formatEth(event.paid)}</span>
                    )}
                    <span className="text-ash">{timeAgo(event.timestamp)}</span>
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      )}

      <div className="mt-2.5 border-t border-slate/60 pt-2 text-xs text-ash">
        {t.home.live.note}
      </div>
    </section>
  );
}
