"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { explorerUrl } from "@/lib/rh-chain";
import {
  getPublicClient,
  CORE_ADDRESS,
  PROOF_OF_CARD_ABI,
} from "@/lib/poc";
import { formatUsdc } from "@/lib/format";
import { imageQuery } from "@/lib/traits-set";
import { Panel, PageHero, StatPill, StatBar } from "../../spirit/ui";
import { IconCollection } from "../../spirit/icons";

const publicClient = getPublicClient();

type TokenData = {
  owner: string;
  seed: string;
  price?: bigint;
};

/** Elemental accent palette — point accents only (brief §2). */
const ELEMENTS = [
  "var(--color-ice)",
  "var(--color-magma)",
  "var(--color-moss)",
  "var(--color-spark)",
  "var(--color-storm)",
  "var(--color-celestial)",
];

/**
 * Presentational seed → stat preview. Display-only: it maps the recorded seed
 * to a stable, per-card HP/ATK/DEF range so the stat bars are deterministic and
 * distinct per card, without touching the page's contract reads. Not the
 * authoritative battle profile (that lives on-chain in Battle.statsOf).
 */
function seedStat(seed: string, salt: number, min: number, max: number): number {
  let h = (salt + 1) * 2654435761;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

export default function TokenPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [data, setData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!/^\d+$/.test(id)) {
      setError("Token id must be an unsigned integer.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const tokenId = BigInt(id);

    (async () => {
      try {
        const [owner, seed, price] = await Promise.all([
          publicClient.readContract({
            address: CORE_ADDRESS,
            abi: PROOF_OF_CARD_ABI,
            functionName: "ownerOf",
            args: [tokenId],
          }),
          publicClient.readContract({
            address: CORE_ADDRESS,
            abi: PROOF_OF_CARD_ABI,
            functionName: "seedOf",
            args: [tokenId],
          }),
          publicClient
            .readContract({
              address: CORE_ADDRESS,
              abi: PROOF_OF_CARD_ABI,
              functionName: "currentPrice",
            })
            .catch(() => undefined),
        ]);
        if (!cancelled) setData({ owner, seed, price });
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load token";
          setError(
            message.includes("revert") || /owner|exist|minted/i.test(message)
              ? "This card has not been minted yet."
              : message,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Presentational stat previews (stable per seed) — see seedStat() note above.
  const hp = data ? seedStat(data.seed, 0, 50, 180) : 0;
  const atk = data ? seedStat(data.seed, 1, 8, 46) : 0;
  const def = data ? seedStat(data.seed, 2, 4, 33) : 0;
  const glow = data ? ELEMENTS[seedStat(data.seed, 3, 0, ELEMENTS.length - 1)] : "var(--color-ember)";

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Card 卡牌"
        title={id ? `Card #${id}` : "Card"}
        image="/spirit/scene-cards.jpg"
        imageAlt={`Spirit Cards card #${id}`}
        icon={<IconCollection size={18} />}
        subtitle="Card detail — seed-derived combat stats, rarity and the on-chain ownership record."
      >
        {data && (
          <>
            <StatPill label="HP" value={String(hp)} />
            <StatPill label="ATK" value={String(atk)} />
            <StatPill label="DEF" value={String(def)} />
          </>
        )}
      </PageHero>

      <Link
        href="/collection"
        className="inline-flex items-center gap-2 font-code text-[11px] uppercase tracking-[0.14em] text-ash transition-colors hover:text-bone"
      >
        ← Back to collection
      </Link>

      {loading && (
        <div className="mt-5 panel-flat px-4 py-3 font-code text-sm text-ash">Loading card…</div>
      )}
      {error && (
        <div className="mt-5 border border-magma/60 bg-magma/10 px-4 py-3 font-code text-sm text-magma">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
          {/* ---------------------------------------------------------- */}
          {/* Card visual — gold hairline + element glow (brief §5)       */}
          {/* ---------------------------------------------------------- */}
          <div>
            <div className="glow-halo" style={{ "--glow": glow } as CSSProperties}>
              <div className="relative z-[1] overflow-hidden rounded-[2px] border border-gold/40 bg-[#0b0e12]">
                {imgFailed ? (
                  <div className="grid aspect-[512/716] place-items-center gap-1 font-code text-xs text-ash">
                    <span>#{id}</span>
                    <span>image unavailable</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-auto w-full"
                    src={`/api/image/${id}${imageQuery()}`}
                    alt={`Spirit Cards #${id}`}
                    onError={() => setImgFailed(true)}
                  />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 font-code text-[10px] uppercase tracking-[0.12em] text-ash">
              <span>Seed-derived art</span>
              <span>1024 × 1024 · PNG</span>
            </div>

            {/* stats HP / ATK / DEF */}
            <div className="mt-5 space-y-3 border border-slate/70 bg-obsidian/40 p-4">
              <div className="font-code text-[10px] uppercase tracking-[0.16em] text-ash">
                Combat stats · seed-derived
              </div>
              <StatBar label="HP" value={hp} max={200} color="var(--color-hp)" />
              <StatBar label="ATK" value={atk} max={50} color="var(--color-atk)" />
              <StatBar label="DEF" value={def} max={40} color="var(--color-def)" />
              <div className="flex items-center justify-between font-code text-[11px]">
                <span className="text-ash">
                  HP <span className="text-hp">{hp}</span>
                </span>
                <span className="text-ash">
                  ATK <span className="text-atk">{atk}</span>
                </span>
                <span className="text-ash">
                  DEF <span className="text-def">{def}</span>
                </span>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Registry entry + on-chain proof                            */}
          {/* ---------------------------------------------------------- */}
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="border border-gold/50 px-2 py-0.5 font-code text-[10px] uppercase tracking-[0.14em] text-gold">
                #{id} / 8888
              </span>
              <span className="font-code text-[11px] uppercase tracking-[0.12em] text-ash">
                Owner
              </span>
              <a
                href={explorerUrl(`address/${data.owner}`)}
                target="_blank"
                rel="noreferrer"
                className="break-all font-code text-[11px] text-bone transition-colors hover:text-ember"
              >
                {data.owner}
              </a>
            </div>

            <Panel kicker="On-chain proof">
              <p className="font-code text-[10px] uppercase tracking-[0.14em] text-ash">
                Read from Robinhood Chain
              </p>

              <dl className="mt-4 divide-y divide-slate/40 font-code text-[12px]">
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="uppercase tracking-[0.12em] text-ash">Token ID</dt>
                  <dd className="text-bone">#{id}</dd>
                </div>
                {data.price !== undefined && (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="uppercase tracking-[0.12em] text-ash">Current mint price</dt>
                    <dd className="text-gold">
                      {data.price === 0n ? "FREE" : `${formatUsdc(data.price)} ETH`}
                    </dd>
                  </div>
                )}
              </dl>

              {/* collapsible raw contract fields */}
              <details className="mt-3 border border-slate/60 bg-obsidian/40">
                <summary className="cursor-pointer px-3 py-2 font-code text-[10px] uppercase tracking-[0.14em] text-ash transition-colors hover:text-bone">
                  Raw contract fields
                </summary>
                <dl className="space-y-2.5 border-t border-slate/60 px-3 py-3 font-code text-[11px]">
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-ash">Seed (seedOf)</dt>
                    <dd className="break-all text-bone">{data.seed}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-ash">Owner</dt>
                    <dd className="break-all text-bone">{data.owner}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-ash">tokenURI</dt>
                    <dd>
                      <a
                        href={`/api/meta/${id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-ember hover:underline"
                      >
                        /api/meta/{id} ↗
                      </a>
                    </dd>
                  </div>
                </dl>
              </details>

              <div className="mt-4 flex flex-col gap-3 border-t border-slate/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="max-w-md text-xs text-ash">
                  Metadata and image are derived from the recorded seed (placeholder art until final
                  traits ship).
                </span>
                <a
                  href={explorerUrl(`address/${CORE_ADDRESS}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost px-4 py-2 text-xs"
                >
                  View contract on explorer →
                </a>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </main>
  );
}
