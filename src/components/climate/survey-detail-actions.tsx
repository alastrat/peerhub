"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
}

export function SurveyDetailActions({
  surveyId,
  surveyStatus,
}: SurveyDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const isDraft = surveyStatus === "DRAFT";
  const isActive = surveyStatus === "ACTIVE";
  const isClosed = surveyStatus === "CLOSED";

  const previewUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/survey-preview/${surveyId}`
      : `/survey-preview/${surveyId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      toast.success("Preview link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeSurvey(surveyId);
      if (result.success) {
        toast.success("Survey closed");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to close survey");
      }
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      const result = await reactivateSurvey(surveyId);
      if (result.success) {
        toast.success("Survey reactivated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reactivate survey");
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
            Edit survey
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`/survey-preview/${surveyId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye className="mr-2 h-4 w-4" />
            Open preview
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Copy preview link
        </DropdownMenuItem>

        {(isActive || isClosed) && (
          <>
            <DropdownMenuSeparator />
            {isActive && (
              <DropdownMenuItem
                onClick={handleClose}
                className="text-destructive focus:text-destructive"
              >
                <PowerOff className="mr-2 h-4 w-4" />
                Close survey
              </DropdownMenuItem>
            )}
            {isClosed && (
              <DropdownMenuItem onClick={handleReactivate}>
                <Power className="mr-2 h-4 w-4" />
                Reactivate survey
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
