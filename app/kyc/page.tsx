import type { Metadata } from "next";
import { Suspense } from "react";
import { KycFlow } from "@/components/kyc/kyc-flow";

export const metadata: Metadata = {
  title: "Verify your identity — BanglaPay",
};

export default function KycPage() {
  return (
    <Suspense fallback={null}>
      <KycFlow />
    </Suspense>
  );
}
