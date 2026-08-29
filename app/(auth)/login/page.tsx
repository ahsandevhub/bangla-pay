import type { Metadata } from "next";
import { AuthFlow } from "@/components/auth/auth-flow";

export const metadata: Metadata = {
  title: "Log in — BanglaPay",
};

export default function LoginPage() {
  return <AuthFlow mode="login" />;
}
