"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  getPublicClient,
  CORE_ADDRESS,
  CONFIG_ADDRESS,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
} from "@/lib/poc";
import { formatUsdc } from "@/lib/format";
import { OPENSEA_URL, GITHUB_URL, X_URL, TELEGRAM_URL, GITBOOK_EN_URL, GITBOOK_ZH_URL } from "@/lib/site";
import { RENDER_VERSION } from "@/lib/traits-set";
import { Panel, Kicker, BtnEmber, BtnGhost, LoopDiagram, TerminalPanel, ElementList } from "./spirit/ui";
import { SocialLinks } from "./spirit/social-links";
import catalog from "@/lib/poc-art.catalog.json";

const publicClient = getPublicClient();

type SpeciesEntry = { id: string; name: string; role: string };
const SPECIES = (catalog as unknown as { species: SpeciesEntry[] }).species;

type Summary = {
  totalMinted: bigint;
  totalForged: bigint;
  maxSupply: bigint;
  price: bigint;
};

function shortAddr(a: string) {
  return `${a.slice(0, 5)}…${a.slice(-4)}`;
}

/**
 * Landing (`/`) — Spirit Cards.
 * Flagship key-art as full-bleed hero (wordmark + tagline are baked into the
 * art, so NO duplicate title): only a working CTA + live-mining panel, then
 * the bento dashboard (brief §6.1).
 */
export default function HomePage() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [totalMinted, totalForged, maxSupply, price] = await Promise.all([
          publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "totalMinted" }),
          publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "forged" }).catch(() => 0n),
          publicClient.readContract({ address: CONFIG_ADDRESS, abi: CONFIG_ABI, functionName: "maxSupply" }).catch(() => 0n),
          publicClient.readContract({ address: CORE_ADDRESS, abi: PROOF_OF_CARD_ABI, functionName: "currentPrice" }).catch(() => 0n),
        ]);
        if (!cancelled) setS({ totalMinted, totalForged, maxSupply, price });
      } catch {
        /* RPC hiccup — panels fall back to placeholders */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const minted = s ? s.totalMinted.toString() : "0";
  const max = s && s.maxSupply > 0n ? s.maxSupply.toString() : "8888";
  const price = s && s.price > 0n ? `${formatUsdc(s.price)} ETH` : "0.00037 ETH";

  return (
    <>
      {/* Flagship hero — full-bleed key-art (brief §6.1). No duplicate title. */}
      <section className="relative w-full">
        {/* desktop: full poster (keeps baked wordmark) with a functional overlay */}
        <div className="relative hidden aspect-[2048/1152] w-full md:block">
          <Image
            src="/poa/poc/hero-flagship.jpg"
            alt="Spirit Cards — elemental creatures rising from stone and flame"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* live-mining + CTA panel — Start mining is the long ember CTA;
              Collection + OpenSea sit under it, each half-width. */}
          <div className="panel-flat absolute left-[4.4%] top-[59.5%] w-[33%] px-5 py-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-code text-3xl font-bold leading-none text-bone">{minted} / {max}</p>
                <p className="mt-1 font-code text-[9px] uppercase tracking-[0.16em] text-ash">
                  Creatures minted
                </p>
              </div>
              <div>
                <p className="font-code text-3xl font-bold leading-none text-bone">{price}</p>
                <p className="mt-1 font-code text-[9px] uppercase tracking-[0.16em] text-ash">
                  Mint price
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <BtnEmber href="/mine" className="flex w-full items-center justify-center py-2.5 text-xs">
                Start mining
              </BtnEmber>
              <div className="grid grid-cols-2 gap-2">
                <BtnGhost href="/collection" className="flex w-full items-center justify-center py-2 text-[11px]">
                  Collection
                </BtnGhost>
                <a
                  href={OPENSEA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost flex w-full items-center justify-center py-2 text-[11px]"
                >
                  OpenSea <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
          {/* social links — a single row anchored bottom-right of the key-art, on its own
              opaque backing so the baked-in art text behind it stays unreadable/does not clash */}
          <div className="absolute bottom-[5%] right-[2.5%] flex flex-wrap items-center justify-end gap-2 border border-slate/60 bg-obsidian/85 px-3 py-2 backdrop-blur-sm">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
              GitHub <span aria-hidden="true">↗</span>
            </a>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
              Telegram <span aria-hidden="true">↗</span>
            </a>
            <a href={X_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
              X <span aria-hidden="true">↗</span>
            </a>
            <a href={GITBOOK_EN_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
              GitBook EN <span aria-hidden="true">↗</span>
            </a>
            <a href={GITBOOK_ZH_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
              文档 中文 <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        {/* mobile: cover banner (baked text is unreadable at this width) */}
        <div className="relative h-[240px] w-full md:hidden">
          <Image
            src="/poa/poc/hero-flagship.jpg"
            alt="Spirit Cards"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-obsidian to-transparent p-3">
            <BtnEmber href="/mine" className="flex w-full items-center justify-center py-2.5 text-xs">
              Start mining
            </BtnEmber>
            <div className="grid grid-cols-2 gap-2">
              <BtnGhost href="/collection" className="flex w-full items-center justify-center py-2 text-xs">
                Collection
              </BtnGhost>
              <a
                href={OPENSEA_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost flex w-full items-center justify-center py-2 text-xs"
              >
                OpenSea <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
        {/* mobile: social links row (below the cover) */}
        <div className="flex flex-wrap justify-center gap-2 border-b border-slate/60 bg-[#11151b] px-3 py-3 md:hidden">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
            Telegram <span aria-hidden="true">↗</span>
          </a>
          <a href={X_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
            X <span aria-hidden="true">↗</span>
          </a>
          <a href={GITBOOK_EN_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
            GitBook EN <span aria-hidden="true">↗</span>
          </a>
          <a href={GITBOOK_ZH_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-[11px]">
            文档 中文 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel kicker="The Elemental Loop" className="lg:col-span-7">
            <LoopDiagram />
          </Panel>

          <Panel kicker="Mint Stats" className="lg:col-span-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-5">
                <div>
                  <p className="font-code text-[11px] uppercase tracking-[0.16em] text-ash">Genesis supply</p>
                  <p className="font-code text-4xl font-bold text-bone">
                    {minted} <span className="text-ash">/ {max}</span>
                  </p>
                </div>
                <div>
                  <p className="font-code text-[11px] uppercase tracking-[0.16em] text-ash">Mint price</p>
                  <p className="font-code text-4xl font-bold text-bone">{price}</p>
                </div>
              </div>
              <BtnEmber href="/mine">Start mining</BtnEmber>
            </div>
          </Panel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel kicker="Collection Preview" className="lg:col-span-7">
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SPECIES.map((s) => (
                <a
                  key={s.id}
                  href="/collection"
                  className="group w-[112px] flex-none"
                  title={s.name}
                >
                  <div className="glow-halo" style={{ "--glow": "var(--color-ember)" } as React.CSSProperties}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/preview/${s.id}?w=224&v=${RENDER_VERSION}`}
                      alt={s.name}
                      width={224}
                      height={313}
                      loading="lazy"
                      className="relative z-[1] w-full rounded-[2px] border border-gold/40 transition-transform duration-200 group-hover:-translate-y-1"
                    />
                  </div>
                  <p className="mt-1.5 truncate font-code text-[10px] uppercase tracking-[0.08em] text-ash group-hover:text-bone">
                    {s.name}
                  </p>
                </a>
              ))}
            </div>
          </Panel>

          <Panel kicker="Elements of Life" className="lg:col-span-5">
            <ElementList />
            <p className="mt-4 font-code text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ash/70">
              Different forms. A brighter tomorrow.
            </p>
          </Panel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel kicker="Live on Chain" className="lg:col-span-4">
            <dl className="space-y-2 font-code text-[12px]">
              {[
                ["Total minted", minted],
                ["Merged", s ? s.totalForged.toString() : "0"],
                ["Contract", shortAddr(CORE_ADDRESS)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <dt className="uppercase tracking-[0.14em] text-ash">{k}</dt>
                  <dd className="text-bone">{v}</dd>
                </div>
              ))}
            </dl>
            <a
              href={`https://robinhoodchain.blockscout.com/address/${CORE_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block font-code text-[11px] uppercase tracking-[0.14em] text-ember hover:underline"
            >
              View on explorer ⟶
            </a>
          </Panel>

          <div className="relative min-h-[180px] overflow-hidden rounded-[2px] border border-slate lg:col-span-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spirit/scene-cards.jpg"
              alt="Cards resting in a cave"
              className="h-full w-full object-cover opacity-85"
            />
            <p className="absolute bottom-3 left-4 font-code text-[10px] uppercase leading-relaxed tracking-[0.16em] text-bone/90">
              Real creatures.
              <br />A brighter tomorrow.
            </p>
          </div>

          <Panel kicker="System" className="lg:col-span-4">
            <TerminalPanel />
          </Panel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="relative min-h-[160px] overflow-hidden rounded-[2px] border border-slate lg:col-span-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spirit/scene-dragon.jpg"
              alt="Celestial dragon in a hex portal"
              className="h-full w-full object-cover opacity-85"
            />
          </div>
          <Panel kicker="More than a game" className="lg:col-span-4">
            <p className="font-display text-2xl font-bold uppercase leading-tight tracking-tight text-bone">
              A living
              <br />
              economy
            </p>
            <p className="mt-3 text-sm text-ash">
              Real creatures. Real ownership. Every card is minted by proof of work
              and recorded on chain.
            </p>
          </Panel>
        </div>

        {/* Official links (the sidebar isn't shown on the landing) */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-slate/50 pt-6">
          <span className="font-code text-[10px] uppercase tracking-[0.18em] text-ash">
            Community · official links
          </span>
          <SocialLinks labels className="justify-center" />
        </div>
      </main>
    </>
  );
}
