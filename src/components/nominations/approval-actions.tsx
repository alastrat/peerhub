"use client";

import { useState } from "react";
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
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { bulkApproveNominations } from "@/lib/actions/nominations";

interface ApprovalActionsProps {
  pendingIds: string[];
  onComplete?: () => void;
}

export function ApprovalActions({ pendingIds, onComplete }: ApprovalActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleApproveAll = async () => {
    if (pendingIds.length === 0) return;

    setLoading(true);
    try {
      const result = await bulkApproveNominations(pendingIds);
      if (result.success && result.data) {
        toast.success(
          `Approved ${result.data.approved} nomination${result.data.approved !== 1 ? "s" : ""}${
            result.data.failed > 0 ? `, ${result.data.failed} failed` : ""
          }`
        );
        onComplete?.();
      } else {
        toast.error(result.error || "Failed to approve nominations");
      }
    } catch {
      toast.error("Failed to approve nominations");
    } finally {
      setLoading(false);
    }
  };

  if (pendingIds.length === 0) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Approve All ({pendingIds.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve All Nominations</AlertDialogTitle>
          <AlertDialogDescription>
            This will approve all {pendingIds.length} pending nomination
            {pendingIds.length !== 1 ? "s" : ""}. Review assignments will be
            created for each approved nomination.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApproveAll}>
            Approve All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
