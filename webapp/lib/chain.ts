/**
 * chain.ts — back-compat shim over `lib/poc.ts`.
 *
 * The old PowMintNFT server reads (seedOf + post-inclusion display seed,
 * wave/claims counters) are gone. The POC stack has no per-token nonce getter
 * and no separate claims supply, so the shared server reads now live in
 * `lib/poc.ts` and are re-exported here for existing import sites
 * (`/api/meta`, `/api/image`, `sitemap`, `lib/stats`).
 */
export {
  getOnChainToken,
  getCollectionStats,
  parseTokenId,
  type OnChainToken,
  type CollectionStats,
} from "./poc";
