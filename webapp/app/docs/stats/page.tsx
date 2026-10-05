import type { Metadata } from "next";
import { StatsContent } from "./stats-content";

export const metadata: Metadata = {
  title: "Stats dataset — Spirit Cards",
  description:
    "Machine-readable statistics for Spirit Cards: the JSON schema of /stats/current.json and /stats/history.jsonl, units, methodology and how to cite the data.",
  alternates: {
    languages: { en: "/docs/stats", zh: "/zh/docs/stats" },
  },
};

export default function StatsDocsPage() {
  return <StatsContent locale="en" />;
}
