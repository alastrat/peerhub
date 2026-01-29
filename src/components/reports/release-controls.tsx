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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, SendHorizonal, Undo2, Loader2 } from "lucide-react";
import { releaseReport, releaseAllReports, unreleaseReport } from "@/lib/actions/reports";

interface ReleaseControlsProps {
  cycleId: string;
  participantId?: string;
  participantName?: string;
  isReleased: boolean;
  canRelease: boolean;
  readyCount?: number;
  totalCount?: number;
}

export function ReleaseControls({
  cycleId,
  participantId,
  participantName,
  isReleased,
  canRelease,
  readyCount,
  totalCount,
}: ReleaseControlsProps) {
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRelease = async () => {
    if (!participantId) return;

    setLoading(true);
    try {
      const result = await releaseReport(cycleId, participantId, sendEmail);
      if (result.success) {
        toast.success("Report released successfully");
      } else {
        toast.error(result.error || "Failed to release report");
      }
    } catch {
      toast.error("Failed to release report");
    } finally {
      setLoading(false);
    }
  };

  const handleUnrelease = async () => {
    if (!participantId) return;

    setLoading(true);
    try {
      const result = await unreleaseReport(cycleId, participantId);
      if (result.success) {
        toast.success("Report access revoked");
      } else {
        toast.error(result.error || "Failed to revoke report");
      }
    } catch {
      toast.error("Failed to revoke report");
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseAll = async () => {
    setLoading(true);
    try {
      const result = await releaseAllReports(cycleId, sendEmail);
      if (result.success && result.data) {
        toast.success(
          `Released ${result.data.released} reports${result.data.skipped > 0 ? `, ${result.data.skipped} skipped (insufficient responses)` : ""}`
        );
      } else {
        toast.error(result.error || "Failed to release reports");
      }
    } catch {
      toast.error("Failed to release reports");
    } finally {
      setLoading(false);
    }
  };

  // Single participant controls
  if (participantId) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="send-email"
            checked={sendEmail}
            onCheckedChange={setSendEmail}
            disabled={loading}
          />
          <Label htmlFor="send-email" className="text-sm text-muted-foreground">
            Send email
          </Label>
        </div>

        {isReleased ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Undo2 className="h-4 w-4 mr-2" />
                )}
                Revoke Access
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke Report Access</AlertDialogTitle>
                <AlertDialogDescription>
                  This will revoke {participantName}'s access to their feedback
                  report. They will no longer be able to view it until you
                  release it again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnrelease}>
                  Revoke Access
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!canRelease || loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Release Report
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Release Feedback Report</AlertDialogTitle>
                <AlertDialogDescription>
                  This will make the feedback report available to {participantName}.
                  {sendEmail && " They will receive an email notification."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRelease}>
                  Release Report
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // Bulk release controls
  return (
    <Card>
      <CardHeader>
        <CardTitle>Release Reports</CardTitle>
        <CardDescription>
          Release feedback reports to participants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            id="send-emails"
            checked={sendEmail}
            onCheckedChange={setSendEmail}
            disabled={loading}
          />
          <Label htmlFor="send-emails">Send email notifications</Label>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              disabled={!readyCount || readyCount === 0 || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4 mr-2" />
              )}
              Release All Ready Reports ({readyCount || 0} of {totalCount || 0})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release All Ready Reports</AlertDialogTitle>
              <AlertDialogDescription>
                This will release {readyCount} reports to participants who have
                received enough feedback.
                {sendEmail && " Email notifications will be sent."}
                <br />
                <br />
                Reports with fewer than the minimum required responses will be
                skipped to protect anonymity.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReleaseAll}>
                Release Reports
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {readyCount === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            No reports are ready for release. Participants need a minimum number
            of completed reviews.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
