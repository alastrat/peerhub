import { Suspense } from "react";
import Link from "next/link";
import { ClipboardList, Clock, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_COLORS } from "@/lib/constants/cycle-status";
import { getInitials } from "@/lib/utils/formatting";
import { redirect } from "next/navigation";

async function getMyReviews(companyUserId: string) {
  return prisma.reviewAssignment.findMany({
    where: {
      reviewerId: companyUserId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      cycle: { status: "IN_PROGRESS" },
    },
    include: {
      cycle: true,
      reviewee: {
        include: { user: true },
      },
    },
    orderBy: { cycle: { reviewEndDate: "asc" } },
  });
}

function ReviewsLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ReviewsList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const reviews = await getMyReviews(session.companyUser.id);

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
        title="All caught up!"
        description="You have no pending reviews at the moment. Check back later for new feedback requests."
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((assignment) => {
        const daysLeft = daysUntil(assignment.cycle.reviewEndDate);
        const isOverdue = isDateInPast(assignment.cycle.reviewEndDate);

        return (
          <Link key={assignment.id} href={`/my-reviews/${assignment.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={assignment.reviewee.user.image || undefined} />
                  <AvatarFallback>
                    {assignment.reviewee.user.name
                      ? getInitials(assignment.reviewee.user.name)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {assignment.reviewerType === "SELF"
                        ? "Self Review"
                        : `Review for ${assignment.reviewee.user.name}`}
                    </p>
                    <Badge variant="outline">
                      {REVIEWER_TYPE_LABELS[assignment.reviewerType]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {assignment.cycle.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge className={ASSIGNMENT_STATUS_COLORS[assignment.status]}>
                      {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                    </Badge>
                    <p className={`text-xs mt-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                      {isOverdue ? (
                        "Overdue"
                      ) : daysLeft <= 3 ? (
                        `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
                      ) : (
                        `Due ${formatDate(assignment.cycle.reviewEndDate)}`
                      )}
                    </p>
                  </div>
                  <Button size="sm">
                    {assignment.status === "IN_PROGRESS" ? "Continue" : "Start"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Reviews"
        description="Complete your assigned feedback reviews"
      />

      <Suspense fallback={<ReviewsLoading />}>
        <ReviewsList />
      </Suspense>
    </div>
  );
}
