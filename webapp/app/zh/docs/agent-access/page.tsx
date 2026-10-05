import type { Metadata } from "next";
import { AgentAccessContent } from "@/app/docs/agent-access/agent-access-content";

export const metadata: Metadata = {
  title: "代理接入 — Spirit Cards",
  description:
    "AI 代理和开发者如何与 Spirit Cards 集成：只读 JSON 接口（元数据、图像、积分、统计）、OpenAPI、.well-known/ai.json 和 llms.txt。",
  alternates: {
    canonical: "/zh/docs/agent-access",
    languages: {
      en: "/docs/agent-access",
      zh: "/zh/docs/agent-access",
    },
  },
};

export default function ZhAgentAccessPage() {
  return <AgentAccessContent locale="zh" />;
}
