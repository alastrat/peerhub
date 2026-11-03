/**
 * DEV ONLY — prints fresh sign-in links for the climate demo:
 * the admin (dashboard dev-token route) and portal magic links (24h) for the
 * leaders and a task owner of the demo company.
 *
 * Run: npx tsx scripts/demo-links.ts            (after scripts/seed-climate-demo.ts)
 */
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4999";

async function portalLink(email: string, redirect: string) {
  const employee = await prisma.employee.findFirst({ where: { email }, select: { id: true, name: true, companyId: true } });
  if (!employee) return null;
  const token = randomUUID();
  await prisma.accessToken.create({
    data: {
      token,
      email,
      companyId: employee.companyId,
      employeeId: employee.id,
      purpose: "EMPLOYEE_PORTAL",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return { name: employee.name, url: `${APP_URL}/portal/verify/${token}?redirect=${encodeURIComponent(redirect)}` };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production");
  const survey = await prisma.climateSurvey.findFirst({
    where: { name: "Clima organizacional 2026 (demo)" },
    select: { id: true },
  });
  if (!survey) throw new Error("Run scripts/seed-climate-demo.ts first");

  console.log("\nAdmin (dashboard):");
  console.log(`  ${APP_URL}/api/dev/token?email=admin@acme.com&redirect=/surveys/climate/${survey.id}`);

  const people: [string, string, string][] = [
    ["Leader with 6 reports", "sarah.eng@acme.com", `/portal/climate-results/${survey.id}`],
    ["Leader with 5 reports", "mike.product@acme.com", `/portal/climate-results/${survey.id}`],
    ["Leader with 2 reports (suppressed)", "anna.design@acme.com", "/portal/home"],
    ["Team member (task owner)", "james.dev@acme.com", "/portal/my-tasks"],
  ];
  for (const [role, email, redirect] of people) {
    const link = await portalLink(email, redirect);
    if (link) console.log(`\n${role} — ${link.name}:\n  ${link.url}`);
  }
  console.log("\nPortal links expire in 24 h and work once each; re-run this script for fresh ones.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
