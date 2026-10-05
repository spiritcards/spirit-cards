import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Spirit Cards — Robinhood Chain 上的工作量证明卡牌",
  description:
    "在浏览器中求解 keccak nonce，胜出的哈希即为卡牌的链上种子。挖矿 → 熔合 → 质押 → 对战。",
  alternates: {
    canonical: "/zh",
    languages: {
      en: "/",
      zh: "/zh",
    },
  },
};

export default HomePage;
