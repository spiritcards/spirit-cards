import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { RH_CHAIN_ID, RH_EXPLORER_URL } from "@/lib/rh-chain";
import { CORE_ADDRESS } from "@/lib/poc";
import { docs } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { Panel } from "../spirit/ui";
import { IconDocs } from "../spirit/icons";

/**
 * Docs index content, locale-aware. Rendered by both `/docs` (en) and
 * `/zh/docs` (zh); prose comes from `docs[locale].index`.
 */
export function DocsIndex({ locale }: { locale: Locale }) {
  const t = docs[locale];
  const m = t.index.machineReadable;

  const GAME_GUIDE =
    locale === "zh"
      ? {
          kicker: "重点指南",
          title: "游戏指南",
          summary:
            "Spirit Cards 的完整玩法手册——从挖矿到对战的每个节点，全部机制一页讲清。",
          points: [
            "挖矿 → 熔炼 → 对战 → 质押 → 积分：五节点循环",
            "工作量证明、融炼、六个质押档位、对战 v2（元素 / 技能 / 生命 / 抽成）",
            "卡包、积分、费用分成与推荐，以及链与合约",
          ],
          read: "阅读游戏指南",
        }
      : {
          kicker: "Featured Guide",
          title: "Game Guide",
          summary:
            "The full Spirit Cards playbook — every node from mining to battle, explained in one place.",
          points: [
            "Mine → Merge → Battle → Stake → Points: the five-node loop",
            "Proof-of-work, merge, six staking tiers, Battle v2 (elements / skills / lives / rake)",
            "Packs, points, the fee split and referral, and the chain",
          ],
          read: "Read the game guide",
        };
  const GAME_GUIDE_HREF = locale === "zh" ? "/zh/docs/game" : "/docs/game";

  const DOC_PAGES = [
    { href: "/docs/agent-access", ...t.index.pages.agentAccess },
    { href: "/docs/verification", ...t.index.pages.verification },
    { href: "/docs/stats", ...t.index.pages.stats },
    { href: "/claim", ...t.index.pages.claim },
    { href: "/points", ...t.index.pages.points },
  ];

  const MACHINE_READABLE: { label: string; href: string; note: string }[] = [
    { label: "/openapi.yaml", href: `${SITE_URL}/openapi.yaml`, note: m.openapi },
    {
      label: "/.well-known/ai.json",
      href: `${SITE_URL}/.well-known/ai.json`,
      note: m.aiJson,
    },
    { label: "/llms.txt", href: `${SITE_URL}/llms.txt`, note: m.llmsTxt },
    {
      label: "/llms-full.txt",
      href: `${SITE_URL}/llms-full.txt`,
      note: m.llmsFull,
    },
    { label: "/api/meta/{id}", href: `${SITE_URL}/api/meta/1`, note: m.meta },
    {
      label: "/stats/current.json",
      href: `${SITE_URL}/stats/current.json`,
      note: m.statsCurrent,
    },
    { label: "/api/points", href: `${SITE_URL}/api/points`, note: m.points },
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <Link
        href="/"
        className="font-code text-[11px] uppercase tracking-[0.14em] text-ash transition-colors hover:text-bone"
      >
        {t.index.back}
      </Link>

      <div className="mb-4 mt-3 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-bone sm:text-4xl">
          {t.index.heading}
        </h1>
        <IconDocs className="hidden h-9 w-9 shrink-0 text-ember sm:block" />
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-ash">
        {t.index.introBefore}
        <span className="font-code text-ember">{RH_CHAIN_ID}</span>
        {t.index.introAfter}
      </p>

      <Panel
        kicker={GAME_GUIDE.kicker}
        className="mt-4 border-ember/60"
        bodyClassName="border-t-2 border-t-ember/40"
      >
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-bone">
          <Link href={GAME_GUIDE_HREF} className="transition-colors hover:text-ember">
            {GAME_GUIDE.title}
          </Link>
        </h2>
        <p className="mt-2 text-sm text-ash">{GAME_GUIDE.summary}</p>
        <ul className="mt-3 space-y-1.5">
          {GAME_GUIDE.points.map((point) => (
            <li key={point} className="flex gap-2 text-sm text-bone/90">
              <span className="text-ember" aria-hidden="true">
                ▸
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">
          <Link
            href={GAME_GUIDE_HREF}
            className="font-code text-[11px] uppercase tracking-[0.14em] text-ember hover:underline"
          >
            {GAME_GUIDE.read}
          </Link>
        </p>
      </Panel>

      <div className="mt-4 space-y-4">
        {DOC_PAGES.map((page, i) => (
          <Panel key={page.href} kicker={`Doc ${String(i + 1).padStart(2, "0")}`}>
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-bone">
              <Link href={page.href} className="transition-colors hover:text-ember">
                {page.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-ash">{page.summary}</p>
            <ul className="mt-3 space-y-1.5">
              {page.points.map((point) => (
                <li key={point} className="flex gap-2 text-sm text-bone/90">
                  <span className="text-ember" aria-hidden="true">
                    ▸
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <Link
                href={page.href}
                className="font-code text-[11px] uppercase tracking-[0.14em] text-ember hover:underline"
              >
                {t.index.readLink(page.title)}
              </Link>
            </p>
          </Panel>
        ))}
      </div>

      <Panel kicker={t.index.machineHeading} className="mt-4">
        <p className="text-sm text-ash">{t.index.machineIntro}</p>
        <ul className="mt-4 divide-y divide-slate/40">
          {MACHINE_READABLE.map((item) => (
            <li
              key={item.label}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5"
            >
              <a href={item.href} className="font-code text-xs text-ember hover:underline">
                {item.label}
              </a>
              <span className="max-w-[60%] text-xs text-ash">{item.note}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel kicker={t.index.fullHeading} className="mt-4">
        <p className="text-sm text-ash">{t.index.fullIntro}</p>
        <ul className="mt-3 space-y-1.5">
          <li className="text-sm text-bone/90">
            <a
              href={`${SITE_URL}/llms-full.txt`}
              className="font-code text-xs text-ember hover:underline"
            >
              {SITE_URL}/llms-full.txt
            </a>{" "}
            <span className="text-xs text-ash">{t.index.llmsFullNote}</span>
          </li>
          <li className="text-sm text-bone/90">
            <a
              href={`${SITE_URL}/llms.txt`}
              className="font-code text-xs text-ember hover:underline"
            >
              {SITE_URL}/llms.txt
            </a>{" "}
            <span className="text-xs text-ash">{t.index.llmsTxtNote}</span>
          </li>
        </ul>
      </Panel>

      <p className="mt-5 text-xs text-ash">
        {t.index.contractLabel}
        <span className="font-code text-bone/80">{CORE_ADDRESS}</span>
        {t.index.explorerLabel}
        <a
          href={`${RH_EXPLORER_URL.replace(/\/$/, "")}/address/${CORE_ADDRESS}`}
          className="text-ember hover:underline"
        >
          {t.index.explorerLink}
        </a>
        {t.index.liveSuffix}
      </p>
    </main>
  );
}
