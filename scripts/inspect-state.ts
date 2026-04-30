import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
import { prisma } from "@/lib/db/prisma";

async function main() {
  const user = await prisma.user.findFirst();
  console.log("User:", JSON.stringify(user, null, 2));

  const cu = await prisma.companyUser.findFirst({
    where: { userId: user!.id },
    include: { company: true },
  });
  console.log("\nCompanyUser:", JSON.stringify(cu, null, 2));

  const domains = await prisma.superAdminDomain.findMany();
  console.log("\nSuperAdminDomains:", domains);
}
main().finally(() => prisma.$disconnect());
