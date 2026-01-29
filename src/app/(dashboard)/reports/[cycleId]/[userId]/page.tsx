import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getEmployeeReport } from "@/lib/queries/reports";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "@/components/reports/report-header";
import { RatingSummary } from "@/components/reports/rating-summary";
import { RatingChart } from "@/components/reports/rating-chart";
import { SectionResults } from "@/components/reports/section-results";
import { TextFeedback } from "@/components/reports/text-feedback";
import { ReleaseControls } from "@/components/reports/release-controls";
import type { ReviewerType } from "@prisma/client";

interface PageProps {
  params: Promise<{ cycleId: string; userId: string }>;
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

async function ReportContent({
  cycleId,
  userId,
}: {
  cycleId: string;
  userId: string;
}) {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const report = await getEmployeeReport({
    cycleId,
    companyId: session.companyUser.companyId,
    companyUserId: userId,
  });

  if (!report) {
    notFound();
  }

  // Get participant info for email
  const participant = await prisma.cycleParticipant.findFirst({
    where: {
      cycleId,
      companyUserId: userId,
    },
    include: {
      companyUser: {
        include: { user: true },
      },
      cycle: true,
    },
  });

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

  const totalResponses = Object.values(report.responseCounts).reduce((a, b) => a + b, 0);
  const hasMinimumResponses = totalResponses >= (participant?.cycle.anonymityThreshold || 3);

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href={`/reports/${cycleId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cycle Reports
          </Button>
        </Link>

        <div className="flex items-center gap-4">
          <ReleaseControls
            cycleId={cycleId}
            participantId={userId}
            participantName={report.participantName}
            isReleased={!!report.releasedAt}
            canRelease={hasMinimumResponses}
          />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Header */}
      <ReportHeader
        participantName={report.participantName}
        participantEmail={participant?.companyUser.user.email}
        participantImage={participant?.companyUser.user.image}
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
        minResponses={participant?.cycle.anonymityThreshold || 3}
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

export default async function IndividualReportPage({ params }: PageProps) {
  const { cycleId, userId } = await params;

  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <Suspense fallback={<ReportLoading />}>
      <ReportContent cycleId={cycleId} userId={userId} />
    </Suspense>
  );
}
