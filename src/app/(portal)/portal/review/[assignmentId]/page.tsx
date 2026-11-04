import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getPortalLocale } from "@/lib/auth/portal-locale";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PortalReviewForm } from "@/components/portal/portal-review-form";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { getReviewerTypeLabel } from "@/lib/constants/roles";
import type { ReviewerType } from "@prisma/client";

interface PageProps {
  params: Promise<{ assignmentId: string }>;
}

export default async function PortalReviewPage({ params }: PageProps) {
  const { assignmentId } = await params;

  const session = await getPortalSession();
  if (!session) {
    redirect("/portal");
  }

  const assignment = await prisma.reviewAssignment.findFirst({
    where: {
      id: assignmentId,
      reviewerId: session.employeeId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    include: {
      cycle: {
        include: {
          template: {
            include: {
              sections: {
                include: {
                  questions: {
                    orderBy: { order: "asc" },
                  },
                },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      reviewee: true,
    },
  });

  if (!assignment) {
    notFound();
  }

  const locale = await getPortalLocale();
  const t = await getTranslations({ locale, namespace: "portal.review" });
  const daysLeft = daysUntil(assignment.cycle.reviewEndDate);
  const isOverdue = isDateInPast(assignment.cycle.reviewEndDate);
  const isSelfReview = assignment.reviewerType === "SELF";

  // Parse draft responses if any
  const draftResponses = assignment.draftResponses as Record<
    string,
    { ratingValue?: number; textValue?: string }
  > | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal/home">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={
            isSelfReview
              ? t("self_review")
              : t("review_for", { name: assignment.reviewee.name })
          }
          description={assignment.cycle.name}
        />
      </div>

      {/* Review Context */}
      <Card>
        <CardContent className="p-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {isSelfReview ? t("self_assessment") : assignment.reviewee.name}
            </h2>
            {!isSelfReview && assignment.reviewee.title && (
              <p className="text-muted-foreground">
                {assignment.reviewee.title}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">
                {getReviewerTypeLabel(assignment.reviewerType as ReviewerType, locale)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("due_on", { date: formatDate(assignment.cycle.reviewEndDate, undefined, locale) })}
              </span>
              {isOverdue ? (
                <Badge variant="destructive">{t("overdue")}</Badge>
              ) : daysLeft <= 3 ? (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700"
                >
                  {t("days_left", { count: daysLeft })}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-2">{t("instructions_title")}</h3>
          <p className="text-sm text-muted-foreground">
            {isSelfReview
              ? t("instructions_self")
              : t("instructions_other", { name: assignment.reviewee.name })}
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>{t("tip_autosave")}</li>
            <li>{t("tip_required")}</li>
            <li>{t("tip_resume")}</li>
            <li>{t("tip_final")}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Review Form */}
      <PortalReviewForm
        assignmentId={assignment.id}
        revieweeName={assignment.reviewee.name}
        reviewerType={assignment.reviewerType as ReviewerType}
        sections={assignment.cycle.template.sections.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          reviewerTypes: s.reviewerTypes as ReviewerType[],
          questions: s.questions.map((q) => ({
            id: q.id,
            text: q.text,
            description: q.description,
            type: q.type,
            isRequired: q.isRequired,
            order: q.order,
            config: q.config as Record<string, unknown> | null,
          })),
        }))}
        draftResponses={draftResponses || undefined}
      />
    </div>
  );
}
