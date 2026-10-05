"use client";

import Link from "next/link";
import { hrefFor } from "@/lib/i18n";
import { useI18n } from "@/lib/locale";
import WalletCorner from "./wallet-corner";
import LangSwitch from "./lang-switch";

/**
 * Global header chrome — extracted from the root layout so nav labels and
 * hrefs can follow the active locale (/zh tree) on the client. App-page links
 * (mine/stake/craft/points/agents) stay canonical EN paths until those
 * surfaces get localized.
 */
export default function SiteHeader({ isSoon }: { isSoon: boolean }) {
  const { locale, t } = useI18n();
  const n = t.nav;

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          href={hrefFor(locale, "/")}
          className="brand"
          aria-label={n.ariaHome}
        >
          <span className="brand-mark" aria-hidden="true">
            <img src="/poa/poc/logo.png" alt="" width={34} height={34} />
          </span>
          <span className="brand-text">{n.brand}</span>
        </Link>
        <nav className="site-nav" aria-label={n.ariaNav}>
          <Link href={hrefFor(locale, "/collection")}>{n.collection}</Link>
          {isSoon ? (
            <Link href={hrefFor(locale, "/docs")}>{n.docs}</Link>
          ) : (
            <>
              <Link href="/mine">{n.mine}</Link>
              <Link href="/merge">{n.merge}</Link>
              <Link href="/stake">{n.stake}</Link>
              <Link href="/battle">{n.battle}</Link>
              <Link href="/points">{n.points}</Link>
              <Link href={hrefFor(locale, "/docs")}>{n.docs}</Link>
            </>
          )}
        </nav>
        <div className="header-action">
          {isSoon ? (
            <span className="chip">{n.soonChip}</span>
          ) : (
            <>
              <Link href="/mine" className="button button-primary button-sm">
                {n.startMining}
              </Link>
              <WalletCorner />
            </>
          )}
          <LangSwitch />
        </div>
      </div>
    </header>
  );
}
