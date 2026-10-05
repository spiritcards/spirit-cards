import type { Metadata } from "next";
import ClaimPage from "../../claim/page";

export const metadata: Metadata = {
  title: "卡包（即将推出）— Spirit Cards",
  description:
    "Spirit Cards 的卡包即将推出。挖矿已在 Robinhood Chain 上线。",
  alternates: {
    canonical: "/zh/claim",
    languages: { en: "/claim", zh: "/zh/claim" },
  },
};

export default ClaimPage;
