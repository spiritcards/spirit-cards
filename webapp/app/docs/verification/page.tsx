import type { Metadata } from "next";
import { VerificationContent } from "./verification-content";

export const metadata: Metadata = {
  title: "Verification (proof of work) — Spirit Cards",
  description:
    "The exact keccak proof-of-work math of Spirit Cards: the 104-byte preimage, the leading-zero-bit validity rule, the difficulty formula, a worked example and how to verify a nonce.",
  alternates: {
    languages: {
      en: "/docs/verification",
      zh: "/zh/docs/verification",
    },
  },
};

export default function VerificationPage() {
  return <VerificationContent locale="en" />;
}
