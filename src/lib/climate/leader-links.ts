// A leader's personal link to their team results and action plans (client's
// "enlace_personal_lider"). Unlike portal sign-in links it can be reused —
// the email asks the leader to keep it — until it expires.

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DAY = 24 * 60 * 60 * 1000;

/** How long a personal link works after it's created. */
export const LEADER_LINK_DAYS = 180;
/** A link with less time left than this is replaced, so emails never carry one about to expire. */
const MIN_REMAINING_DAYS = 30;

/** The leader's personal link to one survey's results: reuses their current token when it has time left. */
export async function getLeaderLink(
  employee: { id: string; email: string; companyId: string },
  surveyId: string,
  now = new Date(),
): Promise<string> {
  const existing = await prisma.accessToken.findFirst({
    where: {
      employeeId: employee.id,
      companyId: employee.companyId,
      purpose: "LEADER_LINK",
      expiresAt: { gt: new Date(now.getTime() + MIN_REMAINING_DAYS * DAY) },
    },
    orderBy: { expiresAt: "desc" },
    select: { token: true },
  });
  const token =
    existing?.token ??
    (
      await prisma.accessToken.create({
        data: {
          token: randomUUID(),
          email: employee.email,
          companyId: employee.companyId,
          employeeId: employee.id,
          purpose: "LEADER_LINK",
          expiresAt: new Date(now.getTime() + LEADER_LINK_DAYS * DAY),
        },
        select: { token: true },
      })
    ).token;
  return `${APP_URL}/portal/verify/${token}?redirect=${encodeURIComponent(`/portal/climate-results/${surveyId}`)}`;
}
