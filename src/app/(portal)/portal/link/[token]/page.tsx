import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getPortalLocale } from "@/lib/auth/portal-locale";
import { describeSurveyLink } from "@/lib/climate/survey-links";
import { openSurveyLink } from "@/lib/actions/survey-links";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Personal links are shared by WhatsApp: no indexing, and a generic preview
export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * A personal survey link (for people without a corporate email). Showing
 * this page doesn't use the link, since chat apps fetch links to build
 * previews: "Comenzar" does, signing the person in and opening the survey.
 */
export default async function SurveyLinkPage({ params }: PageProps) {
  const { token } = await params;
  const [state, session, locale] = await Promise.all([describeSurveyLink(token), getPortalSession(), getPortalLocale()]);
  const t = await getTranslations({ locale, namespace: "portal.survey_link" });

  let title: string;
  let body: string;
  let action: React.ReactNode = null;
  switch (state.status) {
    case "valid":
      title = t("greeting", { name: state.firstName });
      body = t("valid_body", { company: state.companyName, survey: state.surveyName });
      action = (
        <form action={openSurveyLink.bind(null, token)}>
          <Button type="submit" size="lg">
            {t("start")}
          </Button>
        </form>
      );
      break;
    case "used":
      // Opened before in this browser: they're still signed in as themselves
      if (session?.employeeId === state.employeeId && session.companyId === state.companyId) {
        title = t("used_here_title");
        body = t("used_here_body");
        action = (
          <Button asChild size="lg">
            <Link href={`/portal/climate-survey/${state.distributionId}`}>{t("continue")}</Link>
          </Button>
        );
      } else {
        title = t("used_title");
        body = t("used_body");
      }
      break;
    case "expired":
      title = t("expired_title");
      body = t("expired_body");
      break;
    case "closed":
      title = t("closed_title");
      body = t("closed_body", { survey: state.surveyName });
      break;
    default:
      title = t("invalid_title");
      body = t("invalid_body");
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-primary" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-muted-foreground">{body}</p>
          </div>
          {action}
        </CardContent>
      </Card>
    </div>
  );
}
