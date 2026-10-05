import { formatUnits } from "viem";

/**
 * The native gas token is ETH with 18 decimals, so token "wei" values use the
 * same 18-decimal scale as ETH. These helpers format a uint256 wei amount into a
 * human ETH string and back.
 *
 * (Function / constant names below are legacy: SPIRIT CARDS gas is ETH, not USDC.)
 */

export const USDC_DECIMALS = 18;

export function formatUsdc(wei: bigint, maxFractionDigits = 6): string {
  const raw = formatUnits(wei, USDC_DECIMALS);
  if (!raw.includes(".")) return raw;

  const [whole, fraction] = raw.split(".");
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");

  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole;
}

/**
 * Rough ETH→USD rate used only for illustrative "$" labels. Not a price feed —
 * set `NEXT_PUBLIC_ETH_USD` (e.g. on Vercel) to change it; defaults to 3000.
 */
export const ETH_USD = (() => {
  const n = Number(process.env.NEXT_PUBLIC_ETH_USD);
  return Number.isFinite(n) && n > 0 ? n : 3000;
})();

/** wei (18-dec ETH) → approximate USD label, e.g. "$3.00" / "<$0.01". */
export function formatUsd(wei: bigint, rate = ETH_USD): string {
  const usd = Number(formatUnits(wei, USDC_DECIMALS)) * rate;
  if (!Number.isFinite(usd) || usd === 0) return "$0";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** Short address: 0x1234…abcd */
export function shortAddress(address: string | null | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Canonical card label — used by the site AND the OpenSea metadata route, so the
 * number shown on OpenSea and on the site can never disagree (the S1 bug was a
 * padded "Card #0001" on-site vs "#1" in metadata). Plain `#<id>`, no padding.
 */
export function cardNumber(id: number | bigint | string): string {
  return `#${id}`;
}
