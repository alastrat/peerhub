import { prisma } from "@/lib/db/prisma";
import { SubmissionSuccess } from "@/components/external/submission-success";
import { TokenExpired } from "@/components/external/token-expired";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ExternalReviewSuccessPage({ params }: PageProps) {
  const { token } = await params;

  // Get token info
  const reviewToken = await prisma.reviewToken.findFirst({
    where: { token },
    include: {
      company: true,
      assignment: {
        include: {
          reviewee: true,
        },
      },
    },
  });

  if (!reviewToken) {
    return <TokenExpired reason="invalid" />;
  }

  return (
    <SubmissionSuccess
      revieweeName={
        reviewToken.assignment?.reviewee.name ||
        reviewToken.assignment?.reviewee.email
      }
      companyName={reviewToken.company.name}
    />
  );
}
