import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { RENDER_VERSION } from "@/lib/traits-set";
import { ElementGlyph } from "./icons";

/**
 * Spirit Cards — presentational kit (brief §5). No hooks; safe in server and
 * client trees. Visual language: obsidian/basalt panels, slate rails, ember CTA,
 * gold rewards, mono numbers, angled cuts.
 */

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="kicker">{"// "}{children}</p>;
}

export function Panel({
  kicker,
  className = "",
  bodyClassName = "",
  children,
}: {
  kicker?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className={`px-5 py-5 sm:px-6 ${bodyClassName}`}>
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        {kicker ? <div className="mt-3">{children}</div> : children}
      </div>
    </section>
  );
}

export function BtnEmber({
  href,
  children,
  className = "",
  arrow = true,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
}) {
  return (
    <Link href={href} className={`btn-ember px-6 py-3 text-sm ${className}`}>
      {children}
      {arrow ? <span aria-hidden="true">⟶</span> : null}
    </Link>
  );
}

export function BtnGhost({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`btn-ghost px-5 py-3 text-xs ${className}`}>
      {children}
    </Link>
  );
}

/** Compact hero stat chip (used in PageHero children and dashboards). */
export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate/70 bg-basalt/80 px-4 py-2 text-right">
      <p className="m-0 font-code text-2xl font-bold leading-none text-bone">{value}</p>
      <p className="mt-1 mb-0 font-code text-[9px] uppercase tracking-[0.16em] text-ash">{label}</p>
    </div>
  );
}

/**
 * PageHero — full-bleed key-art band at the top of an app section (matches the
 * landing hero + /battle). Bleeds to the content edges of a padded
 * `max-w-[1440px] px-4 py-6 md:px-8` container. Pass stat pills / CTA as children.
 */
export function PageHero({
  kicker,
  title,
  subtitle,
  image,
  imageAlt = "",
  icon,
  position = "object-center",
  children,
}: {
  kicker: ReactNode;
  title: string;
  subtitle?: ReactNode;
  image: string;
  imageAlt?: string;
  icon?: ReactNode;
  position?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative -mx-4 -mt-6 mb-4 overflow-hidden border-b border-slate/70 md:-mx-8">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className={`object-cover opacity-70 ${position}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-obsidian/10" />
      <div className="relative flex min-h-[240px] flex-wrap items-end justify-between gap-4 px-4 pb-5 pt-10 md:min-h-[300px] md:px-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            {icon ? (
              <span className="hex grid h-10 w-10 flex-none place-items-center border border-ember/50 bg-obsidian/80 text-ember">
                {icon}
              </span>
            ) : null}
            <Kicker>{kicker}</Kicker>
          </div>
          <h1 className="mt-2 mb-0 font-display text-4xl font-bold uppercase leading-[0.9] tracking-tight text-bone md:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 mb-0 max-w-xl text-sm leading-relaxed text-ash">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="flex flex-wrap items-end gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

/** Thin horizontal stat bar (brief §5). */
export function StatBar({
  label,
  value,
  max,
  color = "var(--color-ember)",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="font-code text-[10px] uppercase tracking-[0.14em] text-ash w-8">
        {label}
      </span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-[1px] bg-slate/60">
        <span
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, background: color }}
        />
      </span>
    </div>
  );
}

const LOOP = [
  { name: "Mine", zh: "挖", d1: "Discover", d2: "rare life", color: "var(--color-ice)", species: "ice_inezhor" },
  { name: "Merge", zh: "熔", d1: "Combine", d2: "evolve", color: "var(--color-magma)", species: "fire_uglepuz" },
  { name: "Stake", zh: "押", d1: "Earn", d2: "rewards", color: "var(--color-moss)", species: "earth_plastun" },
  { name: "Battle", zh: "战", d1: "Prove", d2: "your power", color: "var(--color-storm)", species: "lightning_razryadnik" },
];

/**
 * The Elemental Loop — 4 hex nodes (element-ringed creature portraits) joined
 * by arrows (brief §5 / dashboard reference). Each hex is an outer colored ring
 * + inner dark hex holding the creature art, so the element color reads clearly.
 */
export function LoopDiagram() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-1">
      {LOOP.map((n, i) => (
        <div key={n.name} className="flex flex-1 items-start justify-center">
          <div className="flex flex-col items-center gap-2 text-center">
            <span
              className="hex block p-[2px]"
              style={{ background: n.color, boxShadow: `0 0 26px -6px ${n.color}` }}
            >
              <span className="hex block bg-obsidian p-[3px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/preview/${n.species}?w=160&v=${RENDER_VERSION}`}
                  alt=""
                  width={112}
                  height={112}
                  loading="lazy"
                  className="hex block h-14 w-12 object-cover"
                />
              </span>
            </span>
            <div>
              <p className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-bone">
                {n.name}
              </p>
              <p className="font-code text-[9px] uppercase leading-tight tracking-[0.12em] text-ash">
                {n.d1}
                <br />
                {n.d2}
              </p>
            </div>
          </div>
          {i < LOOP.length - 1 && (
            <span
              className="mt-6 flex-none font-display text-lg leading-none text-ash/50"
              aria-hidden="true"
            >
              ›
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const TERMINAL = [
  ["Connecting to chain", "OK"],
  ["Verifying contracts", "OK"],
  ["Loading elemental data", "OK"],
] as const;

/** // SYSTEM terminal panel (brief §5). */
export function TerminalPanel() {
  return (
    <div className="space-y-1.5">
      {TERMINAL.map(([line, status]) => (
        <p key={line} className="term-line">
          <span className="text-ash/50">{"&gt; "}</span>
          {line}… <span className="term-ok">{status}</span>
        </p>
      ))}
      <p className="term-line">
        <span className="text-ash/50">{"&gt; "}</span>
        Proof of life: <span className="term-active">ACTIVE</span>
      </p>
    </div>
  );
}

const ELEMENTS = [
  { element: "ice", label: "Ice", zh: "冰", species: "Frostpuff", color: "var(--color-ice)" },
  { element: "fire", label: "Magma", zh: "火", species: "Emberback", color: "var(--color-magma)" },
  { element: "earth", label: "Moss", zh: "土", species: "Mossroot", color: "var(--color-moss)" },
  { element: "lightning", label: "Spark", zh: "电", species: "Flashbound", color: "var(--color-spark)" },
  { element: "spirit", label: "Celestial", zh: "星", species: "Moonglimmer", color: "var(--color-celestial)" },
  { element: "air", label: "Storm", zh: "风", species: "Cloudwhisk", color: "var(--color-storm)" },
  { element: "water", label: "Tide", zh: "水", species: "Ripplefin", color: "var(--color-tide)" },
  { element: "metal", label: "Metal", zh: "金", species: "Quicksilver", color: "var(--color-gold)" },
];

/** Elements of Life — the eight elements with a glyph + representative creature. */
export function ElementList() {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-2.5">
      {ELEMENTS.map((e) => (
        <li key={e.element} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <span style={{ color: e.color }}>
              <ElementGlyph element={e.element} size={18} />
            </span>
            <span className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-bone">
              {e.label}
            </span>
          </span>
          <span className="font-code text-[10px] uppercase tracking-[0.1em] text-ash">
            {e.species}
          </span>
        </li>
      ))}
    </ul>
  );
}
