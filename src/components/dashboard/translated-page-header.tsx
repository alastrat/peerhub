"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/design-system/page-header";

interface TranslatedPageHeaderProps {
  titleKey: string;
  descriptionKey?: string;
  namespace?: string;
  children?: React.ReactNode;
  /** Optional dynamic values to interpolate into the description */
  descriptionValues?: Record<string, string>;
}

export function TranslatedPageHeader({
  titleKey,
  descriptionKey,
  namespace = "dashboard.settings_pages",
  children,
  descriptionValues,
}: TranslatedPageHeaderProps) {
  const t = useTranslations(namespace);
  return (
    <PageHeader
      title={t(titleKey)}
      description={descriptionKey ? t(descriptionKey, descriptionValues) : undefined}
    >
      {children}
    </PageHeader>
  );
}
