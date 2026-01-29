"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { getInitials } from "@/lib/utils/formatting";
import { toast } from "sonner";
import { removeNomination, approveNomination, rejectNomination } from "@/lib/actions/nominations";
import type { NominationStatus } from "@prisma/client";

interface NominationCardProps {
  nomination: {
    id: string;
    status: NominationStatus;
    rejectionReason: string | null;
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
  };
  showReviewee?: boolean;
  showApprovalActions?: boolean;
  canRemove?: boolean;
}

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-600",
  },
  APPROVED: {
    icon: CheckCircle2,
    label: "Approved",
    className: "bg-green-500/10 text-green-600",
  },
  REJECTED: {
    icon: XCircle,
    label: "Rejected",
    className: "bg-red-500/10 text-red-600",
  },
};

export function NominationCard({
  nomination,
  showReviewee = false,
  showApprovalActions = false,
  canRemove = false,
}: NominationCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const config = STATUS_CONFIG[nomination.status];
  const StatusIcon = config.icon;

  const handleApprove = async () => {
    setLoading("approve");
    try {
      const result = await approveNomination(nomination.id);
      if (result.success) {
        toast.success("Nomination approved");
      } else {
        toast.error(result.error || "Failed to approve");
      }
    } catch {
      toast.error("Failed to approve nomination");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    try {
      const result = await rejectNomination(nomination.id);
      if (result.success) {
        toast.success("Nomination rejected");
      } else {
        toast.error(result.error || "Failed to reject");
      }
    } catch {
      toast.error("Failed to reject nomination");
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async () => {
    setLoading("remove");
    try {
      const result = await removeNomination(nomination.id);
      if (result.success) {
        toast.success("Nomination removed");
      } else {
        toast.error(result.error || "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove nomination");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border">
      <Avatar className="h-10 w-10">
        <AvatarImage src={nomination.nominee.user.image || undefined} />
        <AvatarFallback>
          {getInitials(nomination.nominee.user.name || nomination.nominee.user.email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {nomination.nominee.user.name || nomination.nominee.user.email}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {nomination.nominee.title || nomination.nominee.user.email}
        </p>
        {showReviewee && (
          <p className="text-xs text-muted-foreground">
            Reviewing: {nomination.reviewee.user.name || nomination.reviewee.user.email}
          </p>
        )}
        {nomination.status === "REJECTED" && nomination.rejectionReason && (
          <p className="text-xs text-red-600 mt-1">
            Reason: {nomination.rejectionReason}
          </p>
        )}
      </div>

      <Badge className={config.className}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>

      {showApprovalActions && nomination.status === "PENDING" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={loading !== null}
          >
            {loading === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={loading !== null}
          >
            {loading === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {canRemove && nomination.status !== "REJECTED" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={loading !== null}
            >
              {loading === "remove" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Nomination</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{" "}
                {nomination.nominee.user.name || nomination.nominee.user.email} as a
                peer reviewer?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
