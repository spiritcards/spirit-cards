import type { Metadata } from "next";
import { StatsContent } from "@/app/docs/stats/stats-content";

export const metadata: Metadata = {
  title: "统计数据集 — Spirit Cards",
  description:
    "Spirit Cards 的机器可读统计数据：/stats/current.json 和 /stats/history.jsonl 的 JSON 模式、单位、方法论，以及如何引用这些数据。",
  alternates: {
    canonical: "/zh/docs/stats",
    languages: { en: "/docs/stats", zh: "/zh/docs/stats" },
  },
};

export default function ZhStatsDocsPage() {
  return <StatsContent locale="zh" />;
}
