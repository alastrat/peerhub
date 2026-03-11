import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";
import { sendPortalMagicLinkEmail } from "@/lib/email/portal-templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface NotifyEmployeeOptions {
  employeeId: string;
  subject: string;
  /** For members (has CompanyUser): the dashboard path to link to (e.g. "/my-reviews") */
  dashboardUrl: string;
  /** Custom email sender for members — receives the full absolute URL */
  sendMemberEmail: (email: string, name: string, url: string) => Promise<void>;
}

/**
 * Notify an employee via the appropriate channel:
 * - If they have a linked CompanyUser (platform access), send a normal email with a dashboard link.
 * - If they do NOT have a CompanyUser, create an AccessToken and send a portal magic link email.
 */
export async function notifyEmployee(
  options: NotifyEmployeeOptions
): Promise<void> {
  const { employeeId, dashboardUrl, sendMemberEmail } = options;

  // Fetch employee with companyUser relation
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { companyUser: true },
  });

  if (!employee) {
    console.error(`notifyEmployee: Employee ${employeeId} not found`);
    return;
  }

  if (employee.companyUser) {
    // Employee has platform access — send normal email with dashboard link
    const fullUrl = dashboardUrl.startsWith("http")
      ? dashboardUrl
      : `${APP_URL}${dashboardUrl}`;
    await sendMemberEmail(employee.email, employee.name, fullUrl);
  } else {
    // Employee does NOT have platform access — create portal magic link
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.accessToken.create({
      data: {
        token,
        email: employee.email,
        companyId: employee.companyId,
        employeeId: employee.id,
        purpose: "EMPLOYEE_PORTAL",
        expiresAt,
      },
    });

    const magicLinkUrl = `${APP_URL}/portal/verify/${token}`;
    await sendPortalMagicLinkEmail(employee.email, employee.name, magicLinkUrl);
  }
}
