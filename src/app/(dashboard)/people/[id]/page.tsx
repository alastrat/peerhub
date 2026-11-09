import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft, Mail, Users } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AccessBadge, RoleBadge } from "@/components/people/person-badges";
import { getInitials } from "@/lib/utils/formatting";
import { BUSINESS_TIME_ZONE, formatDay } from "@/lib/constants/business-time";
import { rosterAccess } from "@/lib/people/access";
import { findPendingInvitation } from "@/lib/queries/people";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getEmployeeRecord(companyId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
    include: {
      department: true,
      manager: true,
      hub: true,
      directReports: {
        where: { isActive: true },
      },
      companyUser: {
        include: { user: true },
      },
      teamMemberships: {
        include: {
          team: {
            include: { department: { select: { name: true } } },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

async function getReviewStats(employeeId: string) {
  const [assignmentsAsReviewee, assignmentsAsReviewer, nominations] = await Promise.all([
    prisma.reviewAssignment.count({
      where: { revieweeId: employeeId },
    }),
    prisma.reviewAssignment.count({
      where: { reviewerId: employeeId },
    }),
    prisma.nomination.count({
      where: { nomineeId: employeeId, status: "APPROVED" },
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
  // Check if the current user's linked employee matches the requested ID
  const isSelf = session.companyUser.employeeId === id;

  if (!isAdmin && !isSelf) {
    redirect("/overview");
  }

  const employee = await getEmployeeRecord(session.companyUser.companyId, id);

  if (!employee) {
    notFound();
  }

  const hasAccount = !!employee.companyUser?.isActive;
  const [stats, invitation, company] = await Promise.all([
    getReviewStats(employee.id),
    hasAccount ? null : findPendingInvitation(employee.companyId, employee.email),
    prisma.company.findUnique({ where: { id: employee.companyId }, select: { featureHubs: true } }),
  ]);
  // Everyone on the roster is a member unless their account (or invitation) says otherwise
  const { role, access } = rosterAccess(employee.companyUser, invitation);
  // Sede is also filled by the import, which creates hubs even with the hubs feature off
  const showHub = (company?.featureHubs ?? false) || !!employee.hub;

  // Dashboard routes have no locale segment: follow the company's language
  const locale = session.companyUser.locale ?? "es";
  const t = await getTranslations({ locale, namespace: "dashboard.people_page.profile" });
  // The people table's names for roles and access, so they read the same in both places
  const tPeople = await getTranslations({ locale, namespace: "dashboard.people" });
  const tFields = await getTranslations({ locale, namespace: "employee_fields" });
  const tDemographics = await getTranslations({ locale, namespace: "demographics" });
  const roleKeys = { ADMIN: "admin", MANAGER: "manager", MEMBER: "member" } as const;

  // Every field the employee import loads, in the template's order
  const details: { label: string; value: React.ReactNode }[] = [
    { label: tFields("national_id"), value: employee.nationalId },
    { label: t("name"), value: employee.name },
    { label: t("title_label"), value: employee.title },
    { label: t("email"), value: employee.email },
    ...(showHub ? [{ label: t("hub"), value: employee.hub?.name }] : []),
    { label: t("department"), value: employee.department?.name },
    {
      label: t("manager"),
      value: employee.manager && (
        <Link href={`/people/${employee.manager.id}`} className="hover:underline">
          {employee.manager.name}
        </Link>
      ),
    },
    { label: tDemographics("fields.start_date"), value: employee.startDate && formatDay(employee.startDate, locale) },
    { label: tDemographics("fields.gender"), value: employee.gender && tDemographics(`gender.${employee.gender}`) },
    { label: tDemographics("fields.birth_date"), value: employee.birthDate && formatDay(employee.birthDate, locale) },
    { label: tFields("job_level"), value: employee.jobLevel && tFields(`job_level_values.${employee.jobLevel}`) },
    // The old CSV template's code: only when someone has one
    ...(employee.employeeCode ? [{ label: t("employee_code_label"), value: employee.employeeCode }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/people">
          <Button variant="ghost" size="icon" aria-label={t("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={employee.name || t("name_fallback")}
          description={employee.title || t("no_title")}
        />
        {isAdmin && (
          <div className="ml-auto">
            <Link href={`/people/${id}/edit`}>
              <Button>{t("edit")}</Button>
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
                <AvatarFallback className="text-2xl">
                  {employee.name ? getInitials(employee.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{employee.name}</h2>
              <p className="text-muted-foreground">{employee.title || t("no_title")}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <RoleBadge role={role} label={tPeople(roleKeys[role])} />
                <AccessBadge access={access} label={tPeople(`access_status.${access}`)} />
                {!employee.isActive && <Badge variant="destructive">{t("inactive")}</Badge>}
              </div>

              <Separator className="my-6" />

              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="break-all">{employee.email}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {access === "INVITED" && invitation
                    ? t("access_detail.INVITED", { date: formatDay(invitation.expiresAt, locale, BUSINESS_TIME_ZONE) })
                    : t(`access_detail.${access}`)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Details */}
        <div className="space-y-6 md:col-span-2">
          {/* Employee details */}
          <Card>
            <CardHeader>
              <CardTitle>{t("details_title")}</CardTitle>
              <CardDescription>{t("details_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {details.map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 font-medium break-words">{value || <span className="font-normal text-muted-foreground">—</span>}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Review Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t("review_stats_title")}</CardTitle>
              <CardDescription>{t("review_stats_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{stats.reviewsReceived}</p>
                  <p className="text-sm text-muted-foreground">{t("reviews_received")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{stats.reviewsGiven}</p>
                  <p className="text-sm text-muted-foreground">{t("reviews_given")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{stats.nominations}</p>
                  <p className="text-sm text-muted-foreground">{t("times_nominated")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Direct Reports */}
          {employee.directReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("direct_reports_title")}</CardTitle>
                <CardDescription>
                  {t("direct_reports_count", { count: employee.directReports.length })}
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
                        <AvatarFallback>
                          {report.name ? getInitials(report.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.title || t("no_title")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Memberships */}
          {employee.teamMemberships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("teams_title")}</CardTitle>
                <CardDescription>
                  {t("teams_count", { count: employee.teamMemberships.length })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employee.teamMemberships.map((tm) => (
                    <div
                      key={tm.team.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{tm.team.name}</p>
                        {tm.team.department && (
                          <p className="text-xs text-muted-foreground">
                            {tm.team.department.name}
                          </p>
                        )}
                      </div>
                      <Badge variant={tm.role === "LEAD" ? "default" : "secondary"} className="text-xs">
                        {tm.role === "LEAD" ? t("team_lead") : t("team_member")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>{t("recent_activity_title")}</CardTitle>
              <CardDescription>{t("recent_activity_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("no_recent_activity")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
