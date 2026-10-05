import type { Metadata } from "next";
import { DocsIndex } from "@/app/docs/docs-index";

export const metadata: Metadata = {
  title: "文档 — Spirit Cards",
  description:
    "面向代理和开发者的 Spirit Cards 文档：如何接入（OpenAPI、llms.txt、.well-known/ai.json）、keccak 工作量证明的验证方式，以及机器可读的统计数据数据集。",
  alternates: {
    canonical: "/zh/docs",
    languages: { en: "/docs", zh: "/zh/docs" },
  },
};

export default function ZhDocsIndexPage() {
  return <DocsIndex locale="zh" />;
}
