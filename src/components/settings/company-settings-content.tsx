"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/design-system/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSettings } from "@/components/settings/language-settings";
import { CompanyLogoSettings } from "@/components/settings/company-logo-settings";
import { CompanyNameEditor } from "@/components/settings/company-name-editor";
import { CompanyDangerZone } from "@/components/settings/company-danger-zone";

interface CompanySettingsContentProps {
  isSuperAdmin: boolean;
  company: {
    id: string;
    isActive: boolean;
    deactivatedAt: string | null;
    name: string;
    slug: string;
    domain: string | null;
    locale: string;
    logo: string | null;
    _count: { users: number; cycles: number; departments: number };
    departments: { id: string; name: string }[];
  };
}

export function CompanySettingsContent({ company, isSuperAdmin }: CompanySettingsContentProps) {
  const t = useTranslations("dashboard.settings");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("company_settings")}
        description={`${t("manage_settings_for")} ${company.name}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("company_info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("name")}</p>
              {/* Keyed so a refreshed name replaces what the editor remembered */}
              <CompanyNameEditor key={company.name} name={company.name} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("slug")}</p>
              <Badge variant="secondary" className="font-mono">
                {company.slug}
              </Badge>
            </div>
            {company.domain && (
              <div>
                <p className="text-sm text-muted-foreground">{t("domain")}</p>
                <p className="text-sm">{company.domain}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("quick_stats")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("members_count")}</span>
              <span className="font-medium">{company._count.users}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("departments_count")}</span>
              <span className="font-medium">{company._count.departments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("review_cycles")}</span>
              <span className="font-medium">{company._count.cycles}</span>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <LanguageSettings currentLocale={company.locale ?? "es"} />

        {/* Logo */}
        <CompanyLogoSettings currentLogo={company.logo} />

        {/* Departments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("departments_count")}</CardTitle>
          </CardHeader>
          <CardContent>
            {company.departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("no_departments")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {company.departments.map((d) => (
                  <Badge key={d.id} variant="outline">
                    {d.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <CompanyDangerZone
            company={{ id: company.id, name: company.name, isActive: company.isActive, deactivatedAt: company.deactivatedAt }}
          />
        )}
      </div>
    </div>
  );
}
