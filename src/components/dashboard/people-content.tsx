"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Upload, Users } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import { PeopleTable, type PersonRow } from "@/components/people/people-table";

interface PeopleContentProps {
  people: PersonRow[];
  featureHubs: boolean;
}

export function PeopleContent({ people, featureHubs }: PeopleContentProps) {
  const t = useTranslations("dashboard.people_page");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <div className="flex gap-2">
          <Link href="/people/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              {t("import_csv")}
            </Button>
          </Link>
          <Link href="/people/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("add_employee")}
            </Button>
          </Link>
        </div>
      </PageHeader>

      {people.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title={t("no_employees_yet")}
          description={t("add_first_member")}
          action={
            <Link href="/people/new">
              <Button>{t("add_employee")}</Button>
            </Link>
          }
        />
      ) : (
        <PeopleTable data={people} featureHubs={featureHubs} />
      )}
    </div>
  );
}
