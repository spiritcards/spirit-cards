"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import WalletCorner from "../wallet-corner";
import LangToggle from "../lang-toggle";
import { canonicalPath, nav } from "@/lib/i18n";
import { useLang } from "@/lib/lang";
import { useMiningRunning } from "@/lib/useMining";
import { captureRefFromUrl } from "@/lib/referral";
import { SocialLinks } from "./social-links";
import {
  IconMine,
  IconMerge,
  IconStake,
  IconBattle,
  IconCollection,
  IconPoints,
  IconDocs,
  IconMenu,
} from "./icons";

type NavKey = "collection" | "mine" | "stake" | "battle" | "merge" | "points" | "docs";
type Item = {
  key: string;
  navKey: NavKey;
  href: string;
  Icon: (p: { className?: string; size?: number }) => ReactNode;
};

/** App information architecture (brief §4): same routes, new chrome. */
const NAV: Item[] = [
  { key: "/collection", navKey: "collection", href: "/collection", Icon: IconCollection },
  { key: "/mine", navKey: "mine", href: "/mine", Icon: IconMine },
  { key: "/stake", navKey: "stake", href: "/stake", Icon: IconStake },
  { key: "/battle", navKey: "battle", href: "/battle", Icon: IconBattle },
  { key: "/merge", navKey: "merge", href: "/merge", Icon: IconMerge },
  { key: "/points", navKey: "points", href: "/points", Icon: IconPoints },
  { key: "/docs", navKey: "docs", href: "/docs", Icon: IconDocs },
];

const SUPER_WORDS = ["COLLECT", "MINE", "EVOLVE", "BATTLE", "OWN"];

function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
        <path
          d="M20 2 35 11v18L20 38 5 29V11z"
          fill="url(#scg)"
          stroke="#E8B457"
          strokeWidth="1.5"
        />
        <path d="M20 10l4 10-4 10-4-10z" fill="#FF6A3D" />
        <defs>
          <linearGradient id="scg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2A1A12" />
            <stop offset="1" stopColor="#0E1116" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Logo />
      <span className="font-display text-[17px] font-bold uppercase leading-none tracking-[0.06em] text-bone">
        Spirit Cards
      </span>
    </Link>
  );
}

/** Global "mining is running" pill — visible on every page while the loop runs. */
function MiningIndicator() {
  const running = useMiningRunning();
  const { t } = useLang();
  if (!running) return null;
  return (
    <Link
      href="/mine"
      title="Mining is running in the background"
      className="hidden items-center gap-2 border border-ember/50 bg-ember/10 px-3 py-1.5 font-code text-[10px] uppercase tracking-[0.14em] text-ember sm:inline-flex"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ember motion-reduce:animate-none" aria-hidden="true" />
      {t.mining}
    </Link>
  );
}

/**
 * Universal top header ("one-pager" style): brand + the FULL app nav + wallet,
 * shown on every route so you can always reach every section. On app routes the
 * desktop left sidebar stays as secondary navigation (structure unchanged).
 */
function TopNav({ active }: { active: string }) {
  const { lang } = useLang();
  const n = nav[lang];
  return (
    <header className="sticky top-0 z-40 border-b border-slate/70 bg-obsidian/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-6">
        <Wordmark />
        <nav
          className="hidden items-center gap-6 font-display text-[12px] font-semibold uppercase tracking-[0.14em] md:flex"
          aria-label="Primary"
        >
          {NAV.map(({ key, navKey, href }) => (
            <Link
              key={key}
              href={href}
              aria-current={active === key ? "page" : undefined}
              className={active === key ? "text-ember" : "text-ash hover:text-bone"}
            >
              {n[navKey]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <MiningIndicator />
          <LangToggle />
          <WalletCorner />
        </div>
      </div>
    </header>
  );
}

/** Bottom tab bar (mobile) — 5 tabs + a "More" sheet (mobile brief §4). */
function MobileTabBar({ active }: { active: string }) {
  const [more, setMore] = useState(false);
  const { lang, t } = useLang();
  const n = nav[lang];
  const primary = NAV.filter((x) => ["/mine", "/collection", "/merge", "/stake", "/battle"].includes(x.key));
  const extra = NAV.filter((x) => ["/points", "/docs"].includes(x.key));

  return (
    <>
      {more && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
          <div
            className="absolute inset-x-0 bottom-[68px] mx-3 border border-slate bg-basalt p-2"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
            role="menu"
          >
            {extra.map(({ key, navKey, href, Icon }) => (
              <Link
                key={key}
                href={href}
                role="menuitem"
                onClick={() => setMore(false)}
                className={`flex items-center gap-3 px-3 py-3 font-display text-sm font-semibold uppercase tracking-[0.1em] ${
                  active === key ? "text-ember" : "text-bone"
                }`}
              >
                <Icon size={20} className={active === key ? "text-ember" : "text-ash"} />
                {n[navKey]}
              </Link>
            ))}
            <div className="mt-1 border-t border-slate/60 px-1 pt-3">
              <SocialLinks labels />
            </div>
          </div>
        </div>
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate bg-obsidian/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <ul
          className="mx-auto flex max-w-[480px] items-stretch justify-between px-2"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {primary.map(({ key, navKey, href, Icon }) => {
            const on = active === key;
            return (
              <li key={key} className="flex-1">
                <Link
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 ${on ? "text-ember" : "text-ash"}`}
                >
                  {on && <span className="absolute inset-x-3 top-0 h-[2px] bg-ember" />}
                  <Icon size={22} />
                  <span className="font-display text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {n[navKey]}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={more}
              className={`relative flex w-full flex-col items-center gap-1 px-1 pb-2 pt-2.5 ${
                extra.some((e) => e.key === active) ? "text-ember" : "text-ash"
              }`}
            >
              <IconMenu size={22} />
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.08em]">
                {t.more}
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

/** Left vertical sidebar — desktop secondary nav on app routes (brief §4). */
function Sidebar({ active }: { active: string }) {
  const { lang } = useLang();
  const n = nav[lang];
  return (
    <aside
      className="fixed bottom-0 left-0 top-14 z-30 hidden w-[236px] flex-col border-r border-slate/70 bg-[#11151b] md:flex"
      aria-label="Sections"
    >
      <div className="border-b border-slate/70 px-5 py-4">
        <ul className="flex flex-col gap-1.5">
          {SUPER_WORDS.map((w) => (
            <li
              key={w}
              className="font-code text-[10px] uppercase tracking-[0.22em] text-ash/70"
            >
              {w}
            </li>
          ))}
        </ul>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV.map(({ key, navKey, href, Icon }) => {
          const on = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 font-display text-sm font-semibold uppercase tracking-[0.1em] transition-colors ${
                on ? "text-bone" : "text-ash hover:text-bone"
              }`}
            >
              {on && <span className="absolute left-0 top-0 h-full w-[3px] bg-ember" />}
              <Icon size={20} className={on ? "text-ember" : "text-ash group-hover:text-bone"} />
              <span>{n[navKey]}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate/70 px-5 py-5">
        <SocialLinks labels className="mb-4" />
        <p className="font-code text-[10px] uppercase leading-relaxed tracking-[0.18em] text-ash/60">
          More than cards.
          <br />A richer reality.
        </p>
      </div>
    </aside>
  );
}

function SpiritFooter() {
  return (
    <footer className="mt-16 border-t border-slate/60 bg-[#0b0e12]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-6 py-6 font-code text-[11px] uppercase tracking-[0.16em] text-ash md:flex-row">
        <span className="text-bone/80">Spirit Cards</span>
        <span>Built on Robinhood Chain · Collect · Evolve · Stake · Battle</span>
        <span className="text-ash/70">// A more elemental tomorrow</span>
      </div>
    </footer>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const canonical = canonicalPath(pathname);
  const isLanding = canonical === "/";

  // Referral attribution: capture `?ref=0x…` from any landing URL once (60-day TTL).
  useEffect(() => {
    captureRefFromUrl();
  }, []);

  return (
    <div className="spirit-app min-h-screen">
      <TopNav active={canonical} />
      {isLanding ? null : <Sidebar active={canonical} />}
      <div className={`${isLanding ? "" : "md:pl-[236px]"} pb-[76px] md:pb-0`}>
        {children}
        <SpiritFooter />
      </div>
      <MobileTabBar active={canonical} />
    </div>
  );
}
