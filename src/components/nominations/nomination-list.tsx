"use client";

import { NominationCard } from "./nomination-card";
import type { NominationStatus } from "@prisma/client";

interface Nomination {
  id: string;
  status: NominationStatus;
  rejectionReason: string | null;
  createdAt: Date;
  nominator: {
    id: string;
    user: {
      name: string | null;
      email: string;
      image: string | null;
    };
  };
  nominee: {
    id: string;
    title: string | null;
    user: {
      name: string | null;
      email: string;
      image: string | null;
    };
  };
  reviewee: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
  };
}

interface NominationListProps {
  nominations: Nomination[];
  showReviewee?: boolean;
  showApprovalActions?: boolean;
  canRemove?: boolean;
  emptyMessage?: string;
}

export function NominationList({
  nominations,
  showReviewee = false,
  showApprovalActions = false,
  canRemove = false,
  emptyMessage = "No nominations yet",
}: NominationListProps) {
  if (nominations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Group by status for approval view
  if (showApprovalActions) {
    const pending = nominations.filter((n) => n.status === "PENDING");
    const approved = nominations.filter((n) => n.status === "APPROVED");
    const rejected = nominations.filter((n) => n.status === "REJECTED");

    return (
      <div className="space-y-6">
        {pending.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Pending Approval ({pending.length})
            </h3>
            <div className="space-y-3">
              {pending.map((nomination) => (
                <NominationCard
                  key={nomination.id}
                  nomination={nomination}
                  showReviewee={showReviewee}
                  showApprovalActions={showApprovalActions}
                  canRemove={canRemove}
                />
              ))}
            </div>
          </div>
        )}

        {approved.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Approved ({approved.length})
            </h3>
            <div className="space-y-3">
              {approved.map((nomination) => (
                <NominationCard
                  key={nomination.id}
                  nomination={nomination}
                  showReviewee={showReviewee}
                  showApprovalActions={false}
                  canRemove={canRemove}
                />
              ))}
            </div>
          </div>
        )}

        {rejected.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Rejected ({rejected.length})
            </h3>
            <div className="space-y-3">
              {rejected.map((nomination) => (
                <NominationCard
                  key={nomination.id}
                  nomination={nomination}
                  showReviewee={showReviewee}
                  showApprovalActions={false}
                  canRemove={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {nominations.map((nomination) => (
        <NominationCard
          key={nomination.id}
          nomination={nomination}
          showReviewee={showReviewee}
          showApprovalActions={showApprovalActions}
          canRemove={canRemove}
        />
      ))}
    </div>
  );
}
