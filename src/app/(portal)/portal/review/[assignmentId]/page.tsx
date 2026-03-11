import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PortalReviewForm } from "@/components/portal/portal-review-form";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";
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
              ? "Self Review"
              : `Review for ${assignment.reviewee.name}`
          }
          description={assignment.cycle.name}
        />
      </div>

      {/* Review Context */}
      <Card>
        <CardContent className="p-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {isSelfReview ? "Your Self Assessment" : assignment.reviewee.name}
            </h2>
            {!isSelfReview && assignment.reviewee.title && (
              <p className="text-muted-foreground">
                {assignment.reviewee.title}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">
                {REVIEWER_TYPE_LABELS[assignment.reviewerType as ReviewerType]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Due {formatDate(assignment.cycle.reviewEndDate)}
              </span>
              {isOverdue ? (
                <Badge variant="destructive">Overdue</Badge>
              ) : daysLeft <= 3 ? (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700"
                >
                  {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-2">Instructions</h3>
          <p className="text-sm text-muted-foreground">
            {isSelfReview
              ? "Take time to reflect on your own performance. Be honest and thoughtful in your self-assessment. This is an opportunity to highlight your achievements and identify areas for growth."
              : `Please provide thoughtful and constructive feedback for ${assignment.reviewee.name}. Your responses will be anonymized and combined with other reviewers' feedback.`}
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>Your progress is automatically saved every 30 seconds</li>
            <li>Required questions are marked with an asterisk (*)</li>
            <li>You can save and return to complete this review later</li>
            <li>Once submitted, you cannot make changes</li>
          </ul>
        </CardContent>
      </Card>

      {/* Review Form */}
      <PortalReviewForm
        assignmentId={assignment.id}
        revieweeName={
          isSelfReview
            ? "yourself"
            : assignment.reviewee.name || "this person"
        }
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
