"use client";

import { useLang } from "@/lib/lang";

/**
 * In-place language toggle for the app shell (EN ⇄ 中文). Sits to the LEFT of
 * the wallet corner in the header. No navigation — it flips the shell + surface
 * copy instantly (see `lib/lang.tsx`). Styled with the same `angler` chip as
 * the wallet corner so it reads as part of the design system.
 */
export default function LangToggle() {
  const { lang, toggle, t } = useLang();
  const toZh = lang === "en";
  const label = toZh ? t.langAriaToZh : t.langAriaToEn;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      lang={toZh ? "zh" : "en"}
      className="angler inline-flex items-center border border-slate bg-basalt px-3 py-2 font-code text-xs font-semibold text-bone transition-colors hover:border-ember focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ember/60"
    >
      {toZh ? t.langToZh : t.langToEn}
    </button>
  );
}
