import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
import { prisma } from "@/lib/db/prisma";
import { getDashboardStats } from "@/lib/queries/dashboard";

async function main() {
  const company = await prisma.company.findFirst();
  console.log("Company:", company?.id, company?.name);
  if (!company) return;
  try {
    const stats = await getDashboardStats({ companyId: company.id });
    console.log("OK keys:", Object.keys(stats));
    console.log("recentCycles len:", stats.recentCycles.length);
  } catch (e) {
    console.error("FAIL:", e);
  }
}
main().finally(() => prisma.$disconnect());
