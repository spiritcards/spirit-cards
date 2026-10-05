"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canonicalPath, localeFromPathname, ZH_ROUTES } from "@/lib/i18n";
import { useI18n } from "@/lib/locale";

/**
 * EN ⇄ 中文 toggle, rendered in the header chrome. Visible only on routes
 * that exist in both languages (ZH_ROUTES); on app pages (mine/stake/...)
 * it renders nothing so users never land on a 404.
 */
export default function LangSwitch() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const canonical = canonicalPath(pathname);
  if (!ZH_ROUTES.includes(canonical)) return null;

  const toZh = locale === "en";
  const href = toZh
    ? canonical === "/"
      ? "/zh"
      : `/zh${canonical}`
    : canonical;
  const label = toZh ? t.nav.langSwitchToZh : t.nav.langSwitchToEn;
  const aria = toZh ? t.nav.langAriaToZh : t.nav.langAriaToEn;

  return (
    <Link
      href={href}
      prefetch={false}
      className="lang-switch"
      aria-label={aria}
      title={aria}
    >
      {label}
    </Link>
  );
}
