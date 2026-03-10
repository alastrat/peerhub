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
      department: true,
      roleConfig: true,
      manager: { include: { user: true } },
      directReports: {
        include: { user: true, department: true },
        where: { isActive: true },
      },
    },
  });

  if (!member) notFound();

  const [reviewsReceived, reviewsGiven, nominations] = await Promise.all([
    prisma.reviewAssignment.count({ where: { revieweeId: memberId } }),
    prisma.reviewAssignment.count({ where: { reviewerId: memberId } }),
    prisma.nomination.count({ where: { nomineeId: memberId, status: "APPROVED" } }),
  ]);

  const [departments, otherMembers] = await Promise.all([
    prisma.department.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.companyUser.findMany({
      where: { companyId, id: { not: memberId }, isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const cycleParticipations = await prisma.cycleParticipant.findMany({
    where: { companyUserId: memberId },
    include: {
      cycle: { select: { id: true, name: true, status: true, reviewStartDate: true, reviewEndDate: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

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
          description={member.title || member.user.email}
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
          title: member.title,
          employeeId: member.employeeId,
          departmentId: member.departmentId,
          department: member.department?.name || null,
          managerId: member.managerId,
          manager: member.manager
            ? { id: member.manager.id, name: member.manager.user.name }
            : null,
          directReports: member.directReports.map((r) => ({
            id: r.id,
            name: r.user.name,
            image: r.user.image,
            title: r.title,
            department: r.department?.name || null,
          })),
          startDate: member.startDate?.toISOString() || null,
          isActive: member.isActive,
          createdAt: member.createdAt.toISOString(),
        }}
        stats={{
          reviewsReceived,
          reviewsGiven,
          nominations,
          directReports: member.directReports.length,
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
        otherMembers={otherMembers.map((m) => ({
          id: m.id,
          name: m.user.name,
        }))}
      />
    </div>
  );
}
