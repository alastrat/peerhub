"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  MoreVertical,
  Edit,
  Eye,
  Copy,
  Check,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { closeSurvey, reactivateSurvey } from "@/lib/actions/climate-distribution";

interface SurveyDetailActionsProps {
  surveyId: string;
  surveyStatus: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  /** Most recent SurveyDistribution id (null if the survey has not been
   *  distributed yet). Required to build the shareable survey URL. */
  latestDistributionId: string | null;
}

export function SurveyDetailActions({
  surveyId,
  surveyStatus,
  latestDistributionId,
}: SurveyDetailActionsProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.climate.detail.actions");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const isActive = surveyStatus === "ACTIVE";
  const isClosed = surveyStatus === "CLOSED";
  // The respondent-facing link points the recipient at the portal, which
  // then forwards them (after sign-in) to the distribution-specific
  // climate-survey route. Only meaningful for ACTIVE surveys that have
  // been distributed at least once.
  const canCopyShareLink = isActive && !!latestDistributionId;

  const handleCopyShareLink = async () => {
    if (typeof window === "undefined" || !latestDistributionId) return;
    const surveyPath = `/portal/climate-survey/${latestDistributionId}`;
    const url = `${window.location.origin}/portal?redirect=${encodeURIComponent(surveyPath)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("link_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copy_failed"));
    }
  };

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeSurvey(surveyId);
      if (result.success) {
        toast.success(t("closed_toast"));
        router.refresh();
      } else {
        toast.error(result.error || t("close_failed"));
      }
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      const result = await reactivateSurvey(surveyId);
      if (result.success) {
        toast.success(t("reactivated_toast"));
        router.refresh();
      } else {
        toast.error(result.error || t("reactivate_failed"));
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/surveys/climate/${surveyId}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            {t("edit_survey")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`/survey-preview/${surveyId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye className="mr-2 h-4 w-4" />
            {t("open_preview")}
          </a>
        </DropdownMenuItem>
        {canCopyShareLink && (
          <DropdownMenuItem onClick={handleCopyShareLink}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {t("copy_link")}
          </DropdownMenuItem>
        )}

        {(isActive || isClosed) && (
          <>
            <DropdownMenuSeparator />
            {isActive && (
              <DropdownMenuItem
                onClick={handleClose}
                className="text-destructive focus:text-destructive"
              >
                <PowerOff className="mr-2 h-4 w-4" />
                {t("close_survey")}
              </DropdownMenuItem>
            )}
            {isClosed && (
              <DropdownMenuItem onClick={handleReactivate}>
                <Power className="mr-2 h-4 w-4" />
                {t("reactivate_survey")}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
