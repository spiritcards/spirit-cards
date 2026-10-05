import { defineChain } from "viem";

/**
 * Spirit Cards — chain definition (Robinhood Chain), NETWORK-PARAMETERIZED.
 *
 * Defaults = Robinhood Chain **mainnet** (chainId 4663) since t9 (2026-10-05). Testnet via env.
 *
 *   NEXT_PUBLIC_RH_CHAIN_ID      default 4663   (testnet: 46630)
 *   NEXT_PUBLIC_RH_RPC_URL       default https://rpc.mainnet.chain.robinhood.com
 *   NEXT_PUBLIC_RH_EXPLORER_URL  default https://robinhoodchain.blockscout.com
 *   NEXT_PUBLIC_RH_IS_TESTNET    default "false"  (testnet: "true")
 *
 * Native gas token is **ETH** (18 decimals) on both testnet and mainnet.
 */

export const RH_CHAIN_ID: number = Number(
  process.env.NEXT_PUBLIC_RH_CHAIN_ID?.trim() || 4663,
);

export const RH_RPC_URLS: string[] = (
  process.env.NEXT_PUBLIC_RH_RPC_URL?.trim() ||
  "https://rpc.mainnet.chain.robinhood.com"
)
  .split(",")
  .map((url) => url.trim())
  .filter((url) => url.length > 0);

export const RH_RPC_URL: string =
  RH_RPC_URLS[0] ?? "https://rpc.mainnet.chain.robinhood.com";

export const RH_EXPLORER_URL: string =
  process.env.NEXT_PUBLIC_RH_EXPLORER_URL?.trim() ||
  "https://robinhoodchain.blockscout.com";

const RH_IS_TESTNET: boolean =
  (process.env.NEXT_PUBLIC_RH_IS_TESTNET?.trim() || "false") !== "false";

export const rhChain = defineChain({
  id: RH_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: RH_RPC_URLS,
    },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: RH_EXPLORER_URL,
    },
  },
  // Multicall3 at the canonical cross-chain address (present on RH testnet).
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: RH_IS_TESTNET,
});

/** Build an explorer link for a token id / address / tx hash. */
export function explorerUrl(path: string): string {
  return `${RH_EXPLORER_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
