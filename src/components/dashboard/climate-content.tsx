"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Thermometer, MoreHorizontal, Copy, Archive } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  CLIMATE_SURVEY_STATUS_LABELS,
  CLIMATE_SURVEY_STATUS_COLORS,
} from "@/lib/constants/climate-survey";

interface SurveyData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  type: string;
  questionCount: number;
  totalResponses: number;
  completedResponses: number;
}

interface ClimateContentProps {
  surveys: SurveyData[];
}

export function ClimateContent({ surveys }: ClimateContentProps) {
  const t = useTranslations("dashboard.climate");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Link href="/surveys/climate/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("create_survey")}
          </Button>
        </Link>
      </PageHeader>

      {surveys.length === 0 ? (
        <EmptyState
          icon={<Thermometer className="h-8 w-8 text-muted-foreground" />}
          title={t("no_surveys_yet")}
          description={t("no_surveys_desc")}
          action={
            <Link href="/surveys/climate/new">
              <Button>{t("create_survey")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card
              key={survey.id}
              className="group relative transition-shadow hover:shadow-md"
            >
              <Link href={`/surveys/climate/${survey.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{survey.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {survey.description || t("no_description")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {survey.questionCount} {t("questions")}
                    </span>
                    {survey.totalResponses > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {survey.completedResponses}/{survey.totalResponses}{" "}
                          {t("responses")}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={
                        CLIMATE_SURVEY_STATUS_COLORS[
                          survey.status as keyof typeof CLIMATE_SURVEY_STATUS_COLORS
                        ] as "default" | "secondary" | "outline"
                      }
                    >
                      {
                        CLIMATE_SURVEY_STATUS_LABELS[
                          survey.status as keyof typeof CLIMATE_SURVEY_STATUS_LABELS
                        ]
                      }
                    </Badge>
                    <Badge variant="secondary">
                      {
                        CLIMATE_SURVEY_TYPE_LABELS[
                          survey.type as keyof typeof CLIMATE_SURVEY_TYPE_LABELS
                        ]
                      }
                    </Badge>
                  </div>
                </CardContent>
              </Link>
              <div className="absolute right-4 top-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      {t("duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Archive className="mr-2 h-4 w-4" />
                      {t("archive")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
