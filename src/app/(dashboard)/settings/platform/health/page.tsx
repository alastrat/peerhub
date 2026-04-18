import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import {
  getPlatformStats,
  getCycleStatusDistribution,
  getTopCompaniesBySize,
} from "@/lib/queries/platform";
import { HealthContent } from "@/components/settings/health-content";

export default async function HealthPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const [stats, cycleDistribution, topCompanies] = await Promise.all([
    getPlatformStats(),
    getCycleStatusDistribution(),
    getTopCompaniesBySize(),
  ]);

  return (
    <HealthContent
      stats={stats}
      cycleDistribution={cycleDistribution}
      topCompanies={topCompanies}
    />
  );
}
