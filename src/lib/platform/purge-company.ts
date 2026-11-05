// Permanently deleting a company. Most of its data cascades from Company, but
// a few relations between its own rows don't (review assignments point at
// employees, review answers at template questions, plans at their owners), so
// those go first, all in one transaction.

import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function purgeCompanyRows(tx: Tx, companyId: string) {
  // 360°: cycles take their participants, nominations, assignments and answers
  await tx.cycle.deleteMany({ where: { companyId } });
  // Climate: plans (tasks, measures, updates, evidence) before their surveys and owners
  await tx.actionPlan.deleteMany({ where: { companyId } });
  await tx.climateSurvey.deleteMany({ where: { companyId } });
  await tx.company.delete({ where: { id: companyId } });
}

/** Delete a company and everything in it. Super-admin callers check permissions first. */
export async function purgeCompany(prisma: PrismaClient, companyId: string) {
  await prisma.$transaction((tx) => purgeCompanyRows(tx, companyId), { timeout: 60_000 });
}
