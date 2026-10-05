import type { Metadata } from "next";
import { GameGuide } from "@/app/docs/game/game-guide";

export const metadata: Metadata = {
  title: "游戏指南 — Spirit Cards",
  description:
    "Spirit Cards 完整双语指南：挖矿 → 熔炼 → 对战 → 质押 → 积分循环、工作量证明挖矿、熔炼、六个质押档位、对战 v2（元素、技能、生命、抽成）、卡包、积分、费用分成与推荐，以及链与合约。",
  alternates: {
    canonical: "/zh/docs/game",
    languages: {
      en: "/docs/game",
      zh: "/zh/docs/game",
    },
  },
};

export default function ZhGameGuidePage() {
  return <GameGuide locale="zh" />;
}
