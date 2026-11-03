import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/db/prisma";
import { getPlanDetail } from "@/lib/queries/action-plans";
import { ActionPlanEditor } from "@/components/climate/plans/action-plan-editor";

interface PageProps {
  params: Promise<{ planId: string }>;
}

export default async function PortalActionPlanPage({ params }: PageProps) {
  const { planId } = await params;
  const session = await getPortalSession();
  if (!session) redirect(`/portal?redirect=${encodeURIComponent(`/portal/climate-plans/${planId}`)}`);

  const plan = await getPlanDetail(planId, session.companyId);
  if (!plan) notFound();

  const isOwner = plan.ownerEmployeeId === session.employeeId;
  const isTaskOwner = plan.tasks.some((t) => t.ownerEmployeeId === session.employeeId);
  if (!isOwner && !isTaskOwner) notFound();

  // Owners assign tasks to themselves or their direct reports
  const employees = isOwner
    ? await prisma.employee.findMany({
        where: {
          companyId: session.companyId,
          isActive: true,
          OR: [{ id: session.employeeId }, { managerId: session.employeeId }],
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const back = isOwner && plan.scope === "LEADER" ? `/portal/climate-results/${plan.surveyId}` : "/portal/my-tasks";
  return (
    <ActionPlanEditor
      plan={plan}
      employees={employees}
      permissions={{ canManage: isOwner, isAdmin: false, viewerEmployeeId: session.employeeId }}
      backHref={isOwner ? back : "/portal/my-tasks"}
      afterDeleteHref={back}
    />
  );
}
