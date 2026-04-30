import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
import { prisma } from "@/lib/db/prisma";

async function main() {
  const u = await prisma.user.findFirst({ select: { email: true, id: true } });
  console.log(u?.email);
  console.log(u?.id);
}
main().finally(() => prisma.$disconnect());
