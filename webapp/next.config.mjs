/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Serve modern image formats (next/image optimizer) — smaller payloads for
  // the PNG-heavy card previews and the hero.
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // The card compositor reads PNG trait layers off disk at runtime, so the
  // files under public/poc-art must be traced into the image/sample lambdas
  // (public/ is normally CDN-only on Vercel).
  outputFileTracingIncludes: {
    "/api/image/**": ["./public/poc-art/**"],
    "/api/sample/**": ["./public/poc-art/**"],
    "/api/preview/**": ["./public/poc-art/**"],
    // The seeded snapshot log lives outside the static CDN path (the route
    // owns its content type), so it must be traced into the history lambda.
    "/stats/history.jsonl": ["./public/data/stats-history.jsonl"],
  },
  async rewrites() {
    // On-chain tokenURI is `${BASE_URI}${id}` (mainnet: https://spiritcards.fun/api/meta/<id>).
    // Map that to the OpenSea metadata route so marketplace metadata and the
    // site are served from the SAME code path (no number/attribute drift).
    return [{ source: "/nft/:id", destination: "/api/meta/:id" }];
  },
  async headers() {
    // llms.txt v2 discoverability: advertise the markdown version of each page
    // and the llms.txt that describes it (HTTP Link header form).
    const describedBy = '</llms.txt>; rel="describedby"';
    const markdown = (path) =>
      `</${path}>; rel="alternate"; type="text/markdown"`;

    // Security hardening (pentest W1: F1 clickjacking / F2 referrer+features /
    // F3 MIME sniffing). CSP is deliberately limited to `frame-ancestors` only:
    // a full CSP would need nonces/hashes for Next.js inline bootstrap and
    // inline styles, which is out of scope here. Header-only, no page changes.
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    // Unhashed /public assets change rarely: keep browsers on a short leash
    // (1h) while letting the CDN hold them much longer with background
    // revalidation, instead of `max-age=0, must-revalidate` on every hit.
    const staticAssets = [
      {
        key: "Cache-Control",
        value:
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    ];

    return [
      // Applies to every route (pages, API, static); merged with the AI
      // discovery Link headers below rather than replacing them.
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      { source: "/poa/:path*", headers: staticAssets },
      { source: "/miner/:path*", headers: staticAssets },
      { source: "/traits/:path*", headers: staticAssets },
      // Card art layers + spirit assets are unhashed and rarely change; keep
      // them CDN-cached instead of revalidating on every request.
      { source: "/poc-art/:path*", headers: staticAssets },
      { source: "/spirit/:path*", headers: staticAssets },
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value: `${describedBy}, ${markdown("index.md")}`,
          },
        ],
      },
      {
        source: "/mine",
        headers: [
          {
            key: "Link",
            value: `${describedBy}, ${markdown("mine.md")}`,
          },
        ],
      },
      {
        source: "/collection",
        headers: [
          {
            key: "Link",
            value: `${describedBy}, ${markdown("collection.md")}`,
          },
        ],
      },
      {
        source: "/merge",
        headers: [
          {
            key: "Link",
            value: `${describedBy}, ${markdown("merge.md")}`,
          },
        ],
      },
      {
        source: "/stake",
        headers: [
          {
            key: "Link",
            value: `${describedBy}, ${markdown("stake.md")}`,
          },
        ],
      },
      {
        source: "/battle",
        headers: [
          {
            key: "Link",
            value: `${describedBy}, ${markdown("battle.md")}`,
          },
        ],
      },
      {
        source: "/points",
        headers: [
          {
            key: "Link",
            value: `${describedBy}, ${markdown("points.md")}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
