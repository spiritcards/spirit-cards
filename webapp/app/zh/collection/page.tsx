import type { Metadata } from "next";
import CollectionPage from "../../collection/page";

export const metadata: Metadata = {
  title: "Spirit Cards — 收藏",
  description:
    "Spirit Cards 的收藏总览：每张卡都由其链上种子确定性地派生，可挖矿、熔合、质押与对战。",
  alternates: {
    canonical: "/zh/collection",
    languages: {
      en: "/collection",
      zh: "/zh/collection",
    },
  },
};

export default CollectionPage;
