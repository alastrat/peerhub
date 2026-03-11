import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { MemberDetail } from "@/components/settings/member-detail";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const member = await prisma.companyUser.findFirst({
    where: { id: memberId, companyId },
    include: {
      user: true,
      roleConfig: true,
      employee: {
        include: {
          department: true,
          manager: true,
          directReports: {
            include: { department: true },
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!member) notFound();

  const employeeId = member.employeeId;

  const [reviewsReceived, reviewsGiven, nominations] = await Promise.all([
    employeeId ? prisma.reviewAssignment.count({ where: { revieweeId: employeeId } }) : Promise.resolve(0),
    employeeId ? prisma.reviewAssignment.count({ where: { reviewerId: employeeId } }) : Promise.resolve(0),
    employeeId ? prisma.nomination.count({ where: { nomineeId: employeeId, status: "APPROVED" } }) : Promise.resolve(0),
  ]);

  const [departments, otherEmployees] = await Promise.all([
    prisma.department.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { companyId, id: { not: employeeId ?? undefined }, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const cycleParticipations = employeeId
    ? await prisma.cycleParticipant.findMany({
        where: { employeeId },
        include: {
          cycle: { select: { id: true, name: true, status: true, reviewStartDate: true, reviewEndDate: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/company/members">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={member.user.name || "Member"}
          description={member.employee?.title || member.user.email}
          className="mb-0"
        />
      </div>
      <MemberDetail
        member={{
          id: member.id,
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          role: member.role,
          roleConfigName: member.roleConfig?.name || null,
          title: member.employee?.title || null,
          employeeId: member.employee?.employeeCode || null,
          departmentId: member.employee?.departmentId || null,
          department: member.employee?.department?.name || null,
          managerId: member.employee?.managerId || null,
          manager: member.employee?.manager
            ? { id: member.employee.manager.id, name: member.employee.manager.name }
            : null,
          directReports: (member.employee?.directReports || []).map((r) => ({
            id: r.id,
            name: r.name,
            image: null,
            title: r.title,
            department: r.department?.name || null,
          })),
          startDate: member.employee?.startDate?.toISOString() || null,
          isActive: member.isActive,
          createdAt: member.createdAt.toISOString(),
        }}
        stats={{
          reviewsReceived,
          reviewsGiven,
          nominations,
          directReports: member.employee?.directReports.length || 0,
        }}
        cycleParticipations={cycleParticipations.map((cp) => ({
          cycleId: cp.cycle.id,
          cycleName: cp.cycle.name,
          cycleStatus: cp.cycle.status,
          startDate: cp.cycle.reviewStartDate?.toISOString() || null,
          endDate: cp.cycle.reviewEndDate?.toISOString() || null,
        }))}
        currentUserId={session.user.id}
        departments={departments}
        otherMembers={otherEmployees.map((e) => ({
          id: e.id,
          name: e.name,
        }))}
      />
    </div>
  );
}
