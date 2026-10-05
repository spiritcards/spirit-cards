import type { Metadata } from "next";
import { DocsIndex } from "./docs-index";

export const metadata: Metadata = {
  title: "Documentation — Spirit Cards",
  description:
    "Agent and developer documentation for Spirit Cards: how to integrate (OpenAPI, llms.txt, .well-known/ai.json), how the keccak proof of work is verified, and the machine-readable stats dataset.",
  alternates: {
    languages: { en: "/docs", zh: "/zh/docs" },
  },
};

export default function DocsIndexPage() {
  return <DocsIndex locale="en" />;
}
