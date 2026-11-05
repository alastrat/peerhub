import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getPlanDetail } from "@/lib/queries/action-plans";
import { actionPlanBackPath } from "@/lib/climate/plan-paths";
import { ActionPlanEditor } from "@/components/climate/plans/action-plan-editor";

interface PageProps {
  params: Promise<{ surveyId: string; planId: string }>;
}

/** One plan in full (admins). Leaders and owners work on their plans in the portal. */
export default async function AdminActionPlanPage({ params }: PageProps) {
  const { surveyId, planId } = await params;
  const session = await auth();
  const cu = session?.companyUser;
  if (!cu) redirect("/login");
  if (cu.role !== "ADMIN") redirect("/action-plans");
  const companyId = cu.companyId;

  const [plan, employees] = await Promise.all([
    getPlanDetail(planId, companyId),
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!plan || plan.surveyId !== surveyId) notFound();

  const back = actionPlanBackPath(plan);
  return (
    <ActionPlanEditor
      plan={plan}
      employees={employees}
      permissions={{ canManage: true, isAdmin: true, viewerEmployeeId: cu.employeeId ?? null }}
      backHref={back}
      afterDeleteHref={back}
    />
  );
}
