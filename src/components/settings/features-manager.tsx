"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Briefcase, UserPlus, BarChart3, MapPin } from "lucide-react";
import { toggleCompanyFeature } from "@/lib/actions/platform";

interface Feature {
  key: "ats" | "onboarding" | "workEnv" | "hubs";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

const FEATURES: Feature[] = [
  {
    key: "ats",
    label: "ATS (Applicant Tracking)",
    description:
      "Publish job openings, manage candidates through a configurable recruitment pipeline, schedule interviews, and generate hiring reports.",
    icon: Briefcase,
    badge: "Recruitment",
  },
  {
    key: "onboarding",
    label: "Onboarding",
    description:
      "Create onboarding plans with checklists, assign buddies/mentors, track new employee progress, and run experience surveys at 30/60/90 days.",
    icon: UserPlus,
    badge: "Talent",
  },
  {
    key: "workEnv",
    label: "Work Environment",
    description:
      "Run organizational climate surveys, pulse surveys, measure eNPS, track engagement dimensions, and create action plans from results.",
    icon: BarChart3,
    badge: "Culture",
  },
  {
    key: "hubs",
    label: "Hubs (Multi-Location)",
    description:
      "Manage multiple offices, branches, or business units. Assign employees to hubs, scope evaluations by location, and view hub-level reports.",
    icon: MapPin,
    badge: "Organization",
  },
];

export function FeaturesManager({
  companyId,
  features: initial,
}: {
  companyId: string;
  features: Record<"ats" | "onboarding" | "workEnv" | "hubs", boolean>;
}) {
  const [features, setFeatures] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (key: "ats" | "onboarding" | "workEnv" | "hubs") => {
    const newValue = !features[key];
    setError(null);

    // Optimistic update
    setFeatures((prev) => ({ ...prev, [key]: newValue }));

    startTransition(async () => {
      const result = await toggleCompanyFeature({
        companyId,
        feature: key,
        enabled: newValue,
      });
      if (!result.success) {
        // Revert
        setFeatures((prev) => ({ ...prev, [key]: !newValue }));
        setError(result.error || "Failed to update feature");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="text-sm text-muted-foreground mb-2">
        360° Feedback is always enabled as the core module.
      </div>

      {FEATURES.map((f) => (
        <Card key={f.key}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {f.label}
                    <Badge variant="outline" className="text-xs font-normal">
                      {f.badge}
                    </Badge>
                  </CardTitle>
                </div>
              </div>
              <Switch
                checked={features[f.key]}
                onCheckedChange={() => handleToggle(f.key)}
                disabled={isPending}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription>{f.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
