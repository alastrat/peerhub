import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getMyPlans, getMyTasks } from "@/lib/queries/action-plans";
import { MyTasksList } from "@/components/climate/plans/my-tasks-list";

export default async function MyTasksPage() {
  const session = await getPortalSession();
  if (!session) redirect(`/portal?redirect=${encodeURIComponent("/portal/my-tasks")}`);

  const [tasks, plans] = await Promise.all([
    getMyTasks(session.employeeId, session.companyId),
    getMyPlans(session.employeeId, session.companyId),
  ]);
  return <MyTasksList tasks={tasks} plans={plans} />;
}
