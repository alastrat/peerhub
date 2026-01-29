import { prisma } from "@/lib/db/prisma";
import { TokenExpired } from "@/components/external/token-expired";
import { ExternalReviewForm } from "@/components/external/external-review-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ExternalReviewPage({ params }: PageProps) {
  const { token } = await params;

  // Get token and validate
  const reviewToken = await prisma.reviewToken.findFirst({
    where: { token },
    include: {
      company: true,
      assignment: {
        include: {
          cycle: {
            include: {
              template: {
                include: {
                  sections: {
                    include: {
                      questions: true,
                    },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
          reviewee: {
            include: { user: true },
          },
        },
      },
    },
  });

  // Check if token exists
  if (!reviewToken) {
    return <TokenExpired reason="invalid" />;
  }

  // Check if token is expired
  if (new Date() > reviewToken.expiresAt) {
    return <TokenExpired reason="expired" />;
  }

  // Check if token has been used
  if (reviewToken.usedAt) {
    return <TokenExpired reason="used" />;
  }

  // Check if assignment exists and is not already completed
  if (!reviewToken.assignment) {
    return <TokenExpired reason="invalid" />;
  }

  if (reviewToken.assignment.status === "COMPLETED") {
    return <TokenExpired reason="used" />;
  }

  // Get the sections with questions filtered by EXTERNAL reviewer type
  const sections = reviewToken.assignment.cycle.template.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    reviewerTypes: section.reviewerTypes,
    questions: section.questions
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: q.id,
        text: q.text,
        description: q.description,
        type: q.type,
        isRequired: q.isRequired,
        config: q.config as {
          scale?: { min: number; max: number; labels?: Record<string, string> };
          maxLength?: number;
          placeholder?: string;
        } | null,
      })),
  }));

  return (
    <ExternalReviewForm
      token={token}
      revieweeName={
        reviewToken.assignment.reviewee.user.name ||
        reviewToken.assignment.reviewee.user.email
      }
      companyName={reviewToken.company.name}
      cycleName={reviewToken.assignment.cycle.name}
      sections={sections}
    />
  );
}
