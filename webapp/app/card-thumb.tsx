"use client";

import { useState } from "react";
import Image from "next/image";
import { imageQuery } from "@/lib/traits-set";

/**
 * Mini card thumbnail — the deterministic placeholder image * as a thumbnail. Used wherever cards were previously shown as bare "#id"
 * numerals (stake chips + staked list, craft picker, gacha modal) so the user
 * always sees WHICH card they are about to stake / burn.
 *
 * Falls back to the plain "#id" label if the image cannot be rendered yet
 * (race right after mint, RPC hiccup server-side, unpublished preview id).
 */
export function CardThumb({
  id,
  size = 48,
  className = "",
}: {
  id: number | bigint | string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const text = String(id);

  // The deterministic render endpoint can hiccup (transient RPC error or a
  // Vercel edge "Security Checkpoint" 403 under a burst of image requests).
  // Those responses are NOT cached, so a single remount retry usually clears
  // it before we fall back to the plain "#id" tile.
  const handleError = () => {
    if (attempt < 1) {
      window.setTimeout(() => setAttempt((a) => (a < 1 ? a + 1 : a)), 1200);
    } else {
      setBroken(true);
    }
  };

  if (broken) {
    return (
      <span
        className={`card-thumb card-thumb-fallback grid place-items-center border border-slate bg-basalt font-code text-ash shadow-[inset_0_0_0_1px_rgba(232,180,87,0.28)] ${className}`.trim()}
        style={{ width: size, height: size, fontSize: Math.max(9, size / 4.5) }}
        aria-label={`Card #${text}`}
      >
        #{text}
      </span>
    );
  }

  return (
    // The deterministic PNG stays the source; next/image downscales it to the
    // thumbnail size (1x/2x srcset) instead of shipping the full 1024px file.
    <Image
      key={`${text}-${attempt}`}
      className={`card-thumb block border border-slate object-cover shadow-[inset_0_0_0_1px_rgba(232,180,87,0.28)] ${className}`.trim()}
      src={`/api/image/${text}${imageQuery(size * 2)}`}
      width={size}
      height={size}
      alt={`Card #${text}`}
      onError={handleError}
    />
  );
}
