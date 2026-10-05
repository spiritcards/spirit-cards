"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { imageQuery } from "@/lib/traits-set";
import { formatUsd } from "@/lib/format";

/**
 * Live battle strip — polls /api/battle-feed every 10s and renders the latest
 * duels as a single horizontal row: opens, resolutions (winner card thumb + the
 * beaten card) and cancels. Oldest first, so fresh duels land on the right edge.
 */

type BattleEvent = {
  kind: "created" | "resolved" | "cancelled";
  duelId: number;
  tokenId: number;
  loseCard?: number;
  account: string;
  payout?: string;
  stake?: string;
  txHash: string;
  timestamp: string;
};

const POLL_MS = 10_000;

function shortAddress(address: string): string {
  if (!address || address.length < 12) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function BattleFeed() {
  const [events, setEvents] = useState<BattleEvent[] | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/battle-feed", { cache: "no-store" });
        const json = (await response.json()) as { events?: BattleEvent[] };
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

  function timeAgo(iso: string): string {
    if (!iso) return "";
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < 0) return "just now";
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const rendered = useMemo(() => [...(events ?? [])].reverse(), [events]);

  useEffect(() => {
    const node = stripRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [rendered]);

  return (
    <section className="panel-flat angler mb-4 px-5 py-4" aria-label="Live battles">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="kicker inline-flex items-center gap-2.5">
          <span
            className="inline-block h-2 w-2 shrink-0 animate-pulse bg-magma shadow-[0_0_0_4px_rgba(226,75,46,0.16)] motion-reduce:animate-none"
            aria-hidden="true"
          />
          {"// Live battles 对战实况"}
        </span>
        {rendered.length > 0 && (
          <span className="font-code text-[10px] uppercase tracking-[0.06em] text-ash">
            {`${rendered.length} event${rendered.length === 1 ? "" : "s"} · live`}
          </span>
        )}
      </div>

      {events === null ? (
        <div className="mt-3 font-code text-xs text-ash">Loading battles…</div>
      ) : rendered.length === 0 ? (
        <div className="mt-3 font-code text-xs text-ash">
          No battles yet — open a duel to start.
        </div>
      ) : (
        <div
          className="mt-3 flex flex-nowrap gap-x-4 gap-y-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={stripRef}
        >
          {rendered.map((event) => {
            const resolved = event.kind === "resolved";
            const cancelled = event.kind === "cancelled";
            const badge = resolved ? "Win" : cancelled ? "Cancel" : "Open";
            const badgeColor = resolved ? "text-gold" : cancelled ? "text-magma" : "text-moss";
            return (
              <a
                className="flex flex-none items-center gap-2.5 whitespace-nowrap font-code text-xs text-bone"
                key={`${event.txHash}-${event.kind}-${event.duelId}`}
                href={`/token/${event.tokenId}`}
                title={`${event.txHash} · ${event.timestamp}`}
              >
                <span className="flex flex-none items-center gap-1">
                  <Image
                    className="block h-14 w-14 flex-none border border-slate object-cover"
                    src={`/api/image/${event.tokenId}${imageQuery(112)}`}
                    alt={`Card #${event.tokenId}`}
                    width={56}
                    height={56}
                  />
                  {resolved && event.loseCard !== undefined && (
                    <Image
                      className="block h-14 w-14 flex-none border border-slate object-cover opacity-40 grayscale"
                      src={`/api/image/${event.loseCard}${imageQuery(112)}`}
                      alt={`Card #${event.loseCard}`}
                      width={56}
                      height={56}
                    />
                  )}
                </span>
                <span className="inline-flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`border border-current px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.07em] ${badgeColor}`}
                    >
                      {badge}
                    </span>
                    <span className="font-semibold">{`Duel #${event.duelId}`}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px]">
                    {resolved ? (
                      <>
                        <span className="text-bone">{`#${event.tokenId}`}</span>
                        {event.loseCard !== undefined && (
                          <span className="text-ash">{`beat #${event.loseCard}`}</span>
                        )}
                        <span className="text-ash">{shortAddress(event.account)}</span>
                        {event.payout !== undefined && (
                          <span className="text-gold">{formatUsd(BigInt(event.payout))}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-bone">{`card #${event.tokenId}`}</span>
                        <span className="text-ash">{shortAddress(event.account)}</span>
                        {!cancelled && event.stake !== undefined && (
                          <span className="text-ash">{formatUsd(BigInt(event.stake))}</span>
                        )}
                      </>
                    )}
                    <span className="text-ash">{timeAgo(event.timestamp)}</span>
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
