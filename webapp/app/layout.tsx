import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono, Inter, JetBrains_Mono } from "next/font/google";
import "./layers.css";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { RH_CHAIN_ID } from "@/lib/rh-chain";
import "./poa/variants/03-with-characters.css";
import "./poa/poc-theme.css";
import "./spirit.css";
import AppShell from "./spirit/app-shell";
import SetLang from "./set-lang";
import { LangProvider } from "@/lib/lang";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Brand fonts — same pairing as the pre-launch landing:
// Space Grotesk (UI/headings) + IBM Plex Mono (micro-labels, numbers, addresses).
const sans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// Spirit Cards — new design system fonts (Ore & Elements, brief §3):
// body = Inter, numbers/hashes/stats = JetBrains Mono.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  keywords: [
    "PoW NFT",
    "proof of work NFT",
    "Robinhood Chain",
    "SPIRIT CARDS",
    "SPC",
    "keccak256 mining",
    "browser mining",
    "collectible cards",
    "merge stake battle",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  alternates: {
    types: {
      "application/rss+xml": "/changelog.xml",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      name: `${SITE_NAME} Miner`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/mine`,
      description:
        "Browser-based proof-of-work miner and NFT minter for the Spirit Cards collection. Grinds a keccak-256 nonce and submits it to the on-chain mine function; cards are minted from the winning hash, then merged, staked and battled.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Spirit Cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Spirit Cards (SPC) is a collectible creature-card collection on Robinhood Chain (chainId ${RH_CHAIN_ID}). Cards are not sold blind — they are mined with proof of work, then merged, staked and battled.`,
          },
        },
        {
          "@type": "Question",
          name: "How does proof-of-work minting work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The miner grinds a keccak256(chainId, core, miner, nonce) hash until it has enough leading zero bits, then calls mine(nonce, useChip) paying the current mint price. The valid hash is recorded on-chain as the card's seed, which deterministically defines its species, element, rarity and stats.",
          },
        },
        {
          "@type": "Question",
          name: "Which chain does Spirit Cards run on?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Robinhood Chain (chainId ${RH_CHAIN_ID}), an Arbitrum-Orbit L2 with ETH as the gas and payment token. The collection is ERC-721 with ERC-2981 royalties; a companion ERC-1155 chip token gives mint discounts.`,
          },
        },
        {
          "@type": "Question",
          name: "Can AI agents use Spirit Cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. A read-only MCP server at /api/mcp exposes 9 tools (stats, cards, nonce verification and grinding, pool, leaderboard), machine-readable datasets are at /api/points and /stats/current.json, and agents can self-register with a wallet signature via POST /api/points/register — no accounts or API keys.",
          },
        },
        {
          "@type": "Question",
          name: "Does it cost money to start?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Grinding the proof-of-work hash is free and runs in the browser. Minting a card costs the current mint price in ETH on Robinhood Chain; staking pays pool dividends and PvP duels are optional.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SetLang />
        <LangProvider>
          <AppShell>{children}</AppShell>
        </LangProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
