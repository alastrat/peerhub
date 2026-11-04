import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getPlanDetail } from "@/lib/queries/action-plans";
import { ActionPlanEditor } from "@/components/climate/plans/action-plan-editor";

interface PageProps {
  params: Promise<{ planId: string }>;
}

/** A plan opened from the company-wide list; same editor as the survey's plans tab. */
export default async function ActionPlanPage({ params }: PageProps) {
  const { planId } = await params;
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }
  const companyId = session.companyUser.companyId;

  const [plan, employees] = await Promise.all([
    getPlanDetail(planId, companyId),
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!plan) notFound();

  return (
    <ActionPlanEditor
      plan={plan}
      employees={employees}
      permissions={{ canManage: true, isAdmin: true, viewerEmployeeId: session.companyUser.employeeId ?? null }}
      backHref="/action-plans"
      afterDeleteHref="/action-plans"
    />
  );
}
