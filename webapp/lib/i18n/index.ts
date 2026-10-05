/**
 * Hand-rolled i18n core: EN (default, canonical paths) + ZH (public layer
 * served under /zh). Dependency-free on purpose — the app ships no i18n
 * framework and the surface is small.
 *
 * Conventions:
 * - EN values in the dictionaries are byte-identical to the original literals
 *   (English is never reworded during extraction).
 * - Client components resolve the locale from the pathname (`useI18n` in
 *   `lib/locale.ts`), so shared client components work in both trees without
 *   prop drilling; server components take a `locale` prop.
 * - Only canonical paths listed in ZH_ROUTES exist under /zh (public layer).
 *   App pages (mine/stake/craft/points/profile/agents) stay EN-only for now.
 */
import { nav } from "./nav";
import { home } from "./home";
import { docs } from "./docs";

export type Locale = "en" | "zh";
export const LOCALES: readonly Locale[] = ["en", "zh"];

/** Canonical EN paths that also exist under /zh. */
export const ZH_ROUTES: readonly string[] = [
  "/",
  "/collection",
  "/claim",
  "/docs",
  "/docs/verification",
  "/docs/stats",
  "/docs/agent-access",
];

/** Locale implied by a pathname (`/zh`, `/zh/...` → zh; everything else en). */
export function localeFromPathname(pathname: string): Locale {
  return pathname === "/zh" || pathname.startsWith("/zh/") ? "zh" : "en";
}

/** Strip the /zh prefix to get the canonical EN path. */
export function canonicalPath(pathname: string): string {
  if (pathname === "/zh") return "/";
  if (pathname.startsWith("/zh/")) return pathname.slice(3);
  return pathname;
}

/** Localized href for a canonical EN path under the given locale. */
export function hrefFor(locale: Locale, canonical: string): string {
  if (locale === "en") return canonical;
  if (!ZH_ROUTES.includes(canonical)) return canonical;
  return canonical === "/" ? "/zh" : `/zh${canonical}`;
}

export { nav, home, docs };
