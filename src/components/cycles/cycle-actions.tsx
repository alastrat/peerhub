"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square, Send, Archive, Loader2 } from "lucide-react";
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
import { launchCycle, closeCycle } from "@/lib/actions/cycles";
import type { Cycle, CycleStatus } from "@prisma/client";

interface CycleActionsProps {
  cycle: Cycle;
}

export function CycleActions({ cycle }: CycleActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLaunch() {
    startTransition(async () => {
      const result = await launchCycle(cycle.id, true);
      if (result.success) {
        toast.success("Cycle launched successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to launch cycle");
      }
    });
  }

  function handleClose() {
    startTransition(async () => {
      const result = await closeCycle(cycle.id);
      if (result.success) {
        toast.success("Cycle closed successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to close cycle");
      }
    });
  }

  if (cycle.status === "DRAFT") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Launch Cycle
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Launch Review Cycle</AlertDialogTitle>
            <AlertDialogDescription>
              This will start the review cycle and create all review assignments.
              {cycle.peerReviewEnabled
                ? " Participants will be notified to nominate their peer reviewers."
                : " Participants will be notified to complete their reviews."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLaunch}>
              Launch Cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (cycle.status === "IN_PROGRESS") {
    return (
      <div className="flex gap-2">
        <Button variant="outline" disabled={isPending}>
          <Send className="mr-2 h-4 w-4" />
          Send Reminders
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              Close Cycle
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close Review Cycle</AlertDialogTitle>
              <AlertDialogDescription>
                This will close the review cycle. No more reviews can be submitted
                after closing. Make sure all reviews are completed before closing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose}>
                Close Cycle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (cycle.status === "CLOSED") {
    return (
      <Button variant="outline" disabled>
        <Archive className="mr-2 h-4 w-4" />
        Archive Cycle
      </Button>
    );
  }

  return null;
}
