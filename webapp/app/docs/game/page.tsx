import type { Metadata } from "next";
import { GameGuide } from "./game-guide";

export const metadata: Metadata = {
  title: "Game Guide — Spirit Cards",
  description:
    "A full bilingual guide to Spirit Cards: the mine → merge → battle → stake → points loop, proof-of-work mining, merge, six staking tiers, Battle v2 (elements, skills, lives, rake), packs, points, the fee split and referral, and the chain.",
  alternates: {
    languages: {
      en: "/docs/game",
      zh: "/zh/docs/game",
    },
  },
};

export default function GameGuidePage() {
  return <GameGuide locale="en" />;
}
