import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Calendar, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getReleasedReportsForUser } from "@/lib/queries/reports";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/dates";

function FeedbackLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function FeedbackList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const reports = await getReleasedReportsForUser(
    session.companyUser.id,
    session.companyUser.companyId
  );

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8 text-muted-foreground" />}
        title="No feedback reports yet"
        description="Your feedback reports will appear here once they are released by your HR team. Check back after your review cycle ends."
      />
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Link key={report.cycleId} href={`/my-feedback/${report.cycleId}`}>
          <Card className="transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{report.cycleName}</h3>
                    <Badge variant="secondary">{report.templateName}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Released {formatDate(report.releasedAt)}</span>
                    </div>
                    <span>•</span>
                    <span>Review period ended {formatDate(report.reviewEndDate)}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function MyFeedbackPage() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Feedback"
        description="View your performance feedback reports from completed review cycles"
      />

      <Suspense fallback={<FeedbackLoading />}>
        <FeedbackList />
      </Suspense>
    </div>
  );
}
