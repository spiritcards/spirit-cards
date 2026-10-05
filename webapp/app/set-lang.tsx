"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "@/lib/i18n";

/**
 * Keeps `<html lang>` in sync with the /zh prefix, including client-side
 * navigations between the EN and ZH trees. The server-rendered attribute
 * stays "en" (single root layout); this corrects it on mount/navigation.
 */
export default function SetLang() {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
