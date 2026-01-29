"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubmissionSuccessProps {
  revieweeName?: string;
  companyName?: string;
}

export function SubmissionSuccess({
  revieweeName,
  companyName,
}: SubmissionSuccessProps) {
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10 w-fit">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle>Thank You!</CardTitle>
          <CardDescription className="text-base">
            Your feedback has been submitted successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {revieweeName ? (
              <>
                Your feedback for <span className="font-medium">{revieweeName}</span>{" "}
                has been recorded.
              </>
            ) : (
              "Your feedback has been recorded."
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {companyName
              ? `${companyName} appreciates your time and thoughtful feedback. Your input helps support the growth and development of their team members.`
              : "Your input is valuable and will help support professional growth and development."}
          </p>
          <div className="pt-4">
            <Button variant="outline" asChild>
              <a href="/">Close This Page</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
