import type { Metadata } from "next";
import { AuthFlow } from "@/components/auth/auth-flow";

export const metadata: Metadata = {
  title: "Sign up — BanglaPay",
};

export default function RegisterPage() {
  return <AuthFlow mode="signup" />;
}
