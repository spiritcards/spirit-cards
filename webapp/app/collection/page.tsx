"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getPublicClient,
  CORE_ADDRESS,
  CONFIG_ADDRESS,
  PROOF_OF_CARD_ABI,
  CONFIG_ABI,
} from "@/lib/poc";
import { formatUsdc } from "@/lib/format";
import { RENDER_VERSION } from "@/lib/traits-set";
import { OPENSEA_URL } from "@/lib/site";
import { useI18n } from "@/lib/locale";
import { PageHero, StatPill, BtnEmber } from "../spirit/ui";
import { ElementGlyph, IconCollection } from "../spirit/icons";
import catalog from "@/lib/poc-art.catalog.json";

const publicClient = getPublicClient();

/** The full creature registry (16 designs: 8 universal beasts + 8 attack dragons). */
type SpeciesEntry = { id: string; name: string; element: string; role: string };
const SPECIES = (catalog as unknown as { species: SpeciesEntry[] }).species;

/** Element accent palette — point accents only (brief §2). */
const ELEMENT_COLOR: Record<string, string> = {
  fire: "var(--color-magma)",
  water: "var(--color-tide)",
  earth: "var(--color-moss)",
  air: "var(--color-storm)",
  lightning: "var(--color-spark)",
  ice: "var(--color-ice)",
  metal: "var(--color-gold)",
  spirit: "var(--color-celestial)",
};
const ELEMENTS = Array.from(new Set(SPECIES.map((s) => s.element)));
const ROLE_BADGE: Record<string, string> = { attack: "Dragon", universal: "Beast" };
/** Display label per element, matching the "Elements of Life" naming. */
const ELEMENT_LABEL: Record<string, string> = {
  fire: "Magma",
  water: "Tide",
  earth: "Moss",
  air: "Storm",
  lightning: "Spark",
  ice: "Ice",
  metal: "Metal",
  spirit: "Celestial",
};

type Summary = {
  totalMinted: bigint;
  totalForged: bigint;
  maxSupply: bigint;
  price: bigint;
};

const DENSITY: Record<"S" | "M" | "L", string> = {
  S: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  M: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  L: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
};

/** Card tile: obsidian frame + gold hairline + element glow (brief §5). */
function CardTile({
  href,
  src,
  alt,
  serial,
  badge,
  glow,
}: {
  href?: string;
  src: string;
  alt: string;
  serial: string;
  badge?: string;
  glow: string;
}) {
  const [broken, setBroken] = useState(false);

  const inner = (
    <>
      <div className="glow-halo" style={{ "--glow": glow } as React.CSSProperties}>
        <div className="relative z-[1] overflow-hidden rounded-[2px] border border-gold/40 bg-[#0b0e12] transition-transform duration-200 group-hover:-translate-y-1">
          {broken ? (
            <div className="grid aspect-[512/716] place-items-center font-code text-xs text-ash">
              {serial}
              <br />
              image pending
            </div>
          ) : (
            <Image
              src={src}
              alt={alt}
              width={512}
              height={716}
              sizes="(max-width: 700px) 46vw, (max-width: 1000px) 30vw, 240px"
              className="h-auto w-full"
              onError={() => setBroken(true)}
            />
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-code text-[11px] tracking-[0.08em] text-bone">{serial}</span>
        {badge ? (
          <span className="border border-gold/50 px-1.5 py-0.5 font-code text-[9px] uppercase tracking-[0.12em] text-gold">
            {badge}
          </span>
        ) : null}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className="group block">
      {inner}
    </Link>
  ) : (
    <div className="group block">{inner}</div>
  );
}

export default function CollectionPage() {
  const { t } = useI18n();
  const g = t.home.grid;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState<"S" | "M" | "L">("M");
  const [element, setElement] = useState<string | null>(null);

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
        if (!cancelled) setSummary({ totalMinted, totalForged, maxSupply, price });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : g.errorGeneric);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [g.errorGeneric]);

  const totalMinted = summary ? Number(summary.totalMinted) : 0;

  /** "Overview of all" — every creature design, filtered by the element chip. */
  const overview = useMemo(
    () => SPECIES.filter((s) => element === null || s.element === element),
    [element],
  );

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Collection 图鉴"
        title="Collection"
        image="/spirit/scene-cards.jpg"
        imageAlt="Spirit Cards — the full creature collection"
        icon={<IconCollection size={18} />}
        subtitle={`Browse the full registry of ${SPECIES.length} creature designs across the eight elements — filter by element or change the grid density to view every card.`}
      >
        <StatPill label="Designs" value={String(SPECIES.length)} />
        <StatPill label="Showing" value={`${overview.length} / ${SPECIES.length}`} />
        <StatPill label="Minted" value={summary ? summary.totalMinted.toString() : "—"} />
        <BtnEmber href="/mine" arrow={false}>
          Buy packs · 购买卡包
        </BtnEmber>
        <a href={OPENSEA_URL} target="_blank" rel="noreferrer" className="btn-ghost px-5 py-3 text-xs">
          OpenSea ↗
        </a>
      </PageHero>

      {summary && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            [g.statMinted, `${summary.totalMinted.toString()}${summary.maxSupply > 0n ? ` / ${summary.maxSupply.toString()}` : ""}`],
            [g.statCurrentPrice, summary.price === 0n ? g.priceFree : `${formatUsdc(summary.price)} ETH`],
            [g.craftedBadge, summary.totalForged.toString()],
          ].map(([label, value]) => (
            <div key={label} className="panel-flat px-4 py-3">
              <p className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">{label}</p>
              <p className="mt-1 font-code text-xl font-bold text-bone">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* sticky filter row — element chips + density S/M/L (brief §6.3/§7) */}
      <div className="sticky top-0 z-20 -mx-4 mt-5 border-y border-slate/70 bg-obsidian/85 px-4 py-2.5 backdrop-blur md:mx-0 md:rounded-[2px] md:border md:px-3">
        <div className="flex items-center gap-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setElement(null)}
            className={`min-h-0 shrink-0 border px-2.5 py-1 font-code text-[10px] uppercase tracking-[0.14em] shadow-none ${
              element === null ? "border-bone text-bone" : "border-slate text-ash hover:border-ash hover:text-bone"
            }`}
          >
            All
          </button>
          {ELEMENTS.map((el) => {
            const color = ELEMENT_COLOR[el] ?? "var(--color-ash)";
            const active = element === el;
            return (
              <button
                key={el}
                type="button"
                onClick={() => setElement(el)}
                aria-label={`Filter: ${ELEMENT_LABEL[el] ?? el}`}
                aria-pressed={active}
                title={ELEMENT_LABEL[el] ?? el}
                className={`flex min-h-0 shrink-0 items-center gap-1.5 border px-2.5 py-1 font-code text-[10px] uppercase tracking-[0.12em] shadow-none transition-colors ${
                  active ? "text-bone" : "border-slate text-ash hover:border-ash hover:text-bone"
                }`}
                style={
                  active
                    ? {
                        borderColor: color,
                        background: `color-mix(in srgb, ${color} 16%, transparent)`,
                      }
                    : undefined
                }
              >
                <span style={{ color }} aria-hidden="true">
                  <ElementGlyph element={el} size={14} />
                </span>
                {ELEMENT_LABEL[el] ?? el}
              </button>
            );
          })}
          <span className="ml-auto flex shrink-0 items-center gap-2" role="group" aria-label="Card size">
            <span className="hidden font-code text-[10px] uppercase tracking-[0.14em] text-ash/70 sm:inline">
              Grid
            </span>
            {(["S", "M", "L"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                aria-label={d === "S" ? "Small cards" : d === "M" ? "Medium cards" : "Large cards"}
                title={d === "S" ? "Small cards" : d === "M" ? "Medium cards" : "Large cards"}
                className={`inline-grid h-7 w-7 min-h-0 place-items-center border-2 p-0 font-code text-[11px] leading-none shadow-none transition-colors ${
                  density === d
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-slate/70 text-ash hover:border-ash hover:text-bone"
                }`}
              >
                {d}
              </button>
            ))}
          </span>
        </div>
      </div>

      {loading && <div className="mt-5 panel-flat px-4 py-3 font-code text-sm text-ash">{g.loading}</div>}
      {error && (
        <div className="mt-5 border border-magma/60 bg-magma/10 px-4 py-3 font-code text-sm text-magma">
          {g.errorReadContract} {error}
        </div>
      )}

      {/* Overview of ALL creature designs — the only content of Collection. */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-tight text-bone">
            All Designs · 全部设计
          </h2>
          <span className="font-code text-[11px] text-ash">{overview.length} / {SPECIES.length}</span>
        </div>
        {overview.length === 0 ? (
          <div className="mt-3 panel-flat px-4 py-3 font-code text-sm text-ash">{g.noTokensYet}</div>
        ) : (
          <div className={`mt-3 grid gap-4 ${DENSITY[density]}`}>
            {overview.map((s) => (
              <CardTile
                key={s.id}
                src={`/api/preview/${s.id}?w=384&v=${RENDER_VERSION}`}
                alt={`${s.name} — Spirit Cards`}
                serial={s.name}
                badge={ROLE_BADGE[s.role] ?? s.role}
                glow={ELEMENT_COLOR[s.element] ?? "var(--color-ember)"}
              />
            ))}
          </div>
        )}
      </section>

      {summary && totalMinted === 0 && (
        <p className="mt-6 font-code text-sm text-ash">
          {g.noTokensYet}{" "}
          <Link href="/mine" className="text-ember">
            {g.beFirstToMine}
          </Link>
        </p>
      )}
    </main>
  );
}
