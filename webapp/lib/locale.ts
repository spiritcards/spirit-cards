"use client";

/**
 * Client-side locale resolution: the locale comes from the URL (`/zh/...` →
 * zh), so every shared client component works in both trees without prop
 * drilling. Mirrors `localeFromPathname` from `lib/i18n`.
 */
import { usePathname } from "next/navigation";
import {
  docs,
  home,
  localeFromPathname,
  nav,
  type Locale,
} from "./i18n";

export function useLocale(): Locale {
  const pathname = usePathname();
  return localeFromPathname(pathname ?? "/");
}

/** Locale + message namespaces for the current route. */
export function useI18n() {
  const locale = useLocale();
  return {
    locale,
    t: {
      nav: nav[locale],
      home: home[locale],
      docs: docs[locale],
    },
  };
}
