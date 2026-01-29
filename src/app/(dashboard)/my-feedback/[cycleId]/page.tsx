import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Download, Lock } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getEmployeeReport } from "@/lib/queries/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "@/components/reports/report-header";
import { RatingSummary } from "@/components/reports/rating-summary";
import { RatingChart } from "@/components/reports/rating-chart";
import { SectionResults } from "@/components/reports/section-results";
import { TextFeedback } from "@/components/reports/text-feedback";
import type { ReviewerType } from "@prisma/client";

interface PageProps {
  params: Promise<{ cycleId: string }>;
}

function ReportLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

async function MyReportContent({ cycleId }: { cycleId: string }) {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  // Check if user has access to this report
  const participant = await prisma.cycleParticipant.findFirst({
    where: {
      cycleId,
      companyUserId: session.companyUser.id,
      releasedAt: { not: null },
    },
    include: {
      cycle: true,
      companyUser: {
        include: { user: true },
      },
    },
  });

  if (!participant) {
    // Check if they are a participant but report not released
    const unreleased = await prisma.cycleParticipant.findFirst({
      where: {
        cycleId,
        companyUserId: session.companyUser.id,
      },
      include: {
        cycle: true,
      },
    });

    if (unreleased) {
      return (
        <div className="space-y-6">
          <Link href="/my-feedback">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Feedback
            </Button>
          </Link>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Report Not Available Yet</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Your feedback report for "{unreleased.cycle.name}" hasn't been
                released yet. You'll receive an email notification when it's
                ready to view.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    notFound();
  }

  const report = await getEmployeeReport({
    cycleId,
    companyId: session.companyUser.companyId,
    companyUserId: session.companyUser.id,
  });

  if (!report) {
    notFound();
  }

  // Calculate rating summary by reviewer type
  const ratingsByType: Record<ReviewerType, { average: number; count: number } | null> = {
    SELF: null,
    MANAGER: null,
    PEER: null,
    DIRECT_REPORT: null,
    EXTERNAL: null,
  };

  // Aggregate ratings from all sections
  const allRatings: Record<ReviewerType, number[]> = {
    SELF: [],
    MANAGER: [],
    PEER: [],
    DIRECT_REPORT: [],
    EXTERNAL: [],
  };

  report.sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (question.questionType === "RATING" || question.questionType === "COMPETENCY_RATING") {
        Object.entries(question.byReviewerType).forEach(([type, result]) => {
          if (result.isVisible && result.rating) {
            allRatings[type as ReviewerType].push(result.rating.average);
          }
        });
      }
    });
  });

  // Calculate averages
  Object.entries(allRatings).forEach(([type, ratings]) => {
    if (ratings.length > 0) {
      const sum = ratings.reduce((a, b) => a + b, 0);
      ratingsByType[type as ReviewerType] = {
        average: Math.round((sum / ratings.length) * 100) / 100,
        count: report.responseCounts[type as ReviewerType],
      };
    }
  });

  // Get overall distribution from first rating question
  let overallDistribution: Record<number, number> = {};
  for (const section of report.sections) {
    for (const question of section.questions) {
      if (question.overall?.distribution) {
        overallDistribution = question.overall.distribution;
        break;
      }
    }
    if (Object.keys(overallDistribution).length > 0) break;
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/my-feedback">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Feedback
          </Button>
        </Link>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Report Header */}
      <ReportHeader
        participantName={report.participantName}
        cycleName={report.cycleName}
        overallScore={report.overallScore}
        responseCounts={report.responseCounts}
        releasedAt={report.releasedAt}
      />

      {/* Rating Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <RatingSummary
          overallScore={report.overallScore}
          byReviewerType={ratingsByType}
        />
        <RatingChart distribution={overallDistribution} />
      </div>

      {/* Text Feedback Summary */}
      <TextFeedback
        strengths={report.strengths}
        opportunities={report.opportunities}
        minResponses={participant.cycle.anonymityThreshold}
      />

      {/* Section Results */}
      {report.sections.map((section) => (
        <SectionResults
          key={section.sectionId}
          sectionTitle={section.sectionTitle}
          questions={section.questions}
        />
      ))}
    </div>
  );
}

export default async function MyFeedbackReportPage({ params }: PageProps) {
  const { cycleId } = await params;

  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<ReportLoading />}>
      <MyReportContent cycleId={cycleId} />
    </Suspense>
  );
}
