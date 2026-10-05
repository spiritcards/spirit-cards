import type { Metadata } from "next";
import { VerificationContent } from "@/app/docs/verification/verification-content";

export const metadata: Metadata = {
  title: "验证（工作量证明）— Spirit Cards",
  description:
    "Spirit Cards 精确的 keccak 工作量证明数学：104 字节原像、前导零位有效性规则、难度公式、一个完整示例，以及如何验证 nonce。",
  alternates: {
    canonical: "/zh/docs/verification",
    languages: {
      en: "/docs/verification",
      zh: "/zh/docs/verification",
    },
  },
};

export default function ZhVerificationPage() {
  return <VerificationContent locale="zh" />;
}
