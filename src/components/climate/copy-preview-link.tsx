"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyPreviewLinkProps {
  surveyId: string;
}

export function CopyPreviewLink({ surveyId }: CopyPreviewLinkProps) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/survey-preview/${surveyId}`
      : `/survey-preview/${surveyId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Preview link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select and copy manually.");
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={copy}>
        {copied ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        Copy preview link
      </Button>
      <Button variant="outline" asChild>
        <a
          href={`/survey-preview/${surveyId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open preview
        </a>
      </Button>
    </div>
  );
}
