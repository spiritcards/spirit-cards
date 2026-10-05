import type { Metadata } from "next";
import { AgentAccessContent } from "./agent-access-content";

export const metadata: Metadata = {
  title: "Agent access — Spirit Cards",
  description:
    "How AI agents and developers integrate with Spirit Cards: read-only JSON endpoints (metadata, image, points, stats), OpenAPI, .well-known/ai.json and llms.txt.",
  alternates: {
    languages: {
      en: "/docs/agent-access",
      zh: "/zh/docs/agent-access",
    },
  },
};

export default function AgentAccessPage() {
  return <AgentAccessContent locale="en" />;
}
