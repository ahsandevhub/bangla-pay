import type { Metadata } from "next";
import { DashboardFlow } from "@/components/dashboard/dashboard-flow";

export const metadata: Metadata = {
  title: "Dashboard — BanglaPay",
};

export default function DashboardPage() {
  return <DashboardFlow />;
}
