"use client";

import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TokenExpiredProps {
  reason: "expired" | "used" | "invalid";
}

const REASON_CONFIG = {
  expired: {
    icon: Clock,
    title: "Link Expired",
    description:
      "This feedback link has expired. If you still need to provide feedback, please contact the person who sent you this link to request a new one.",
    iconColor: "text-orange-500",
  },
  used: {
    icon: CheckCircle2,
    title: "Already Submitted",
    description:
      "You have already submitted your feedback using this link. Each link can only be used once to ensure the integrity of the feedback process.",
    iconColor: "text-green-500",
  },
  invalid: {
    icon: AlertCircle,
    title: "Invalid Link",
    description:
      "This feedback link is not valid. Please check the link and try again, or contact the person who sent you this link for assistance.",
    iconColor: "text-red-500",
  },
};

export function TokenExpired({ reason }: TokenExpiredProps) {
  const config = REASON_CONFIG[reason];
  const Icon = config.icon;

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 p-3 rounded-full bg-muted w-fit ${config.iconColor}`}>
            <Icon className="h-8 w-8" />
          </div>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription className="text-base">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            If you believe this is an error, please contact the organization
            that requested your feedback.
          </p>
          <Button variant="outline" asChild>
            <a href="/">Return Home</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
