"use client";

import { isAddress, type Address } from "viem";

/**
 * Referral attribution helpers (client-side only).
 *
 * Flow: an invite link is `https://<site>/?ref=0x…`. The ref is captured on ANY
 * landing, stored in localStorage with a 60-day attribution window (industry
 * default — same as Dub/PartnerStack-style programs), and offered to the user
 * as a one-time on-chain bind (`SpiritCards.setReferrer`) from their profile.
 * The on-chain binding is the source of truth; the stored value is only a hint.
 */

export const REF_KEY = "sc:ref";
/** Attribution window: 60 days from the click. */
export const REF_TTL_MS = 60 * 24 * 60 * 60 * 1000;

type StoredRef = { address: Address; ts: number };

export function saveRef(address: Address): void {
  try {
    localStorage.setItem(REF_KEY, JSON.stringify({ address, ts: Date.now() } satisfies StoredRef));
  } catch {
    /* storage unavailable */
  }
}

export function getStoredRef(): Address | null {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRef>;
    if (!parsed.address || !isAddress(parsed.address)) return null;
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > REF_TTL_MS) {
      localStorage.removeItem(REF_KEY);
      return null;
    }
    return parsed.address as Address;
  } catch {
    return null;
  }
}

export function clearStoredRef(): void {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Store `?ref=0x…` from the current URL (invalid values are ignored).
 * Idempotent; safe to call on every page load.
 */
export function captureRefFromUrl(): Address | null {
  if (typeof window === "undefined") return null;
  const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
  if (!ref || !isAddress(ref)) return null;
  saveRef(ref as Address);
  return ref as Address;
}

/** Personal invite link for `address` (current origin → works on every domain). */
export function inviteLink(address: Address): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://spiritcards.fun";
  return `${origin}/?ref=${address}`;
}

export function shortAddress(address: string, head = 6, tail = 4): string {
  return address.length > head + tail + 2
    ? `${address.slice(0, head)}…${address.slice(-tail)}`
    : address;
}
