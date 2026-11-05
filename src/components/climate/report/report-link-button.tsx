"use client";

import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens a printable climate report in a new tab. A client component so the label follows the company locale. */
export function ReportLinkButton({ href, className }: { href: string; className?: string }) {
  const t = useTranslations("climate_report");
  return (
    <Button variant="outline" asChild className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <FileDown className="mr-2 h-4 w-4" />
        {t("open_report")}
      </a>
    </Button>
  );
}
