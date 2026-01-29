import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Building2, User, Calendar, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils/formatting";
import { formatDate } from "@/lib/utils/dates";
import { ROLE_LABELS } from "@/lib/constants/roles";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getEmployee(companyId: string, employeeId: string) {
  return prisma.companyUser.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
    include: {
      user: true,
      department: true,
      manager: {
        include: { user: true },
      },
      directReports: {
        include: { user: true },
        where: { isActive: true },
      },
    },
  });
}

async function getReviewStats(companyUserId: string) {
  const [assignmentsAsReviewee, assignmentsAsReviewer, nominations] = await Promise.all([
    prisma.reviewAssignment.count({
      where: { revieweeId: companyUserId },
    }),
    prisma.reviewAssignment.count({
      where: { reviewerId: companyUserId },
    }),
    prisma.nomination.count({
      where: { nomineeId: companyUserId, status: "APPROVED" },
    }),
  ]);

  return {
    reviewsReceived: assignmentsAsReviewee,
    reviewsGiven: assignmentsAsReviewer,
    nominations,
  };
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  // Only admins and the employee themselves can view
  const isAdmin = session.companyUser.role === "ADMIN";
  const isSelf = session.companyUser.id === id;

  if (!isAdmin && !isSelf) {
    redirect("/overview");
  }

  const employee = await getEmployee(session.companyUser.companyId, id);

  if (!employee) {
    notFound();
  }

  const stats = await getReviewStats(employee.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/people">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={employee.user.name || "Employee"}
          description={employee.title || "No title"}
        />
        {isAdmin && (
          <div className="ml-auto">
            <Link href={`/people/${id}/edit`}>
              <Button>Edit Employee</Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={employee.user.image || undefined} />
                <AvatarFallback className="text-2xl">
                  {employee.user.name ? getInitials(employee.user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{employee.user.name}</h2>
              <p className="text-muted-foreground">{employee.title || "No title"}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary">{ROLE_LABELS[employee.role]}</Badge>
                {!employee.isActive && <Badge variant="destructive">Inactive</Badge>}
              </div>

              <Separator className="my-6" />

              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.user.email}</span>
                </div>
                {employee.department && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.department.name}</span>
                  </div>
                )}
                {employee.manager && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Reports to {employee.manager.user.name}</span>
                  </div>
                )}
                {employee.startDate && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Started {formatDate(employee.startDate)}</span>
                  </div>
                )}
                {employee.employeeId && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>ID: {employee.employeeId}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Details */}
        <div className="space-y-6 md:col-span-2">
          {/* Review Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Review Statistics</CardTitle>
              <CardDescription>Summary of feedback participation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{stats.reviewsReceived}</p>
                  <p className="text-sm text-muted-foreground">Reviews Received</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{stats.reviewsGiven}</p>
                  <p className="text-sm text-muted-foreground">Reviews Given</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{stats.nominations}</p>
                  <p className="text-sm text-muted-foreground">Times Nominated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Direct Reports */}
          {employee.directReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Direct Reports</CardTitle>
                <CardDescription>
                  {employee.directReports.length} team member
                  {employee.directReports.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employee.directReports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/people/${report.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={report.user.image || undefined} />
                        <AvatarFallback>
                          {report.user.name ? getInitials(report.user.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{report.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.title || "No title"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Recent feedback and reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity to display
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
