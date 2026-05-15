"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ParticipantScope = "ALL" | "HUB" | "DEPARTMENT" | "TEAM" | "CUSTOM";

export interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  title: string | null;
}

export interface NamedOption {
  id: string;
  name: string;
}

export interface ParticipantScopeValue {
  scope: ParticipantScope;
  /** IDs for HUB / DEPARTMENT / TEAM scopes — empty for ALL and CUSTOM. */
  scopeIds: string[];
  /** Individual employee IDs for the CUSTOM scope — empty for the others. */
  participantIds: string[];
}

interface Props {
  value: ParticipantScopeValue;
  onChange: (next: ParticipantScopeValue) => void;
  employees: EmployeeOption[];
  hubs: NamedOption[];
  departments: NamedOption[];
  teams: NamedOption[];
  featureHubs?: boolean;
  /** Optional wrapper: when true, the picker is wrapped in a Card with a
   *  localized title + description. The wizard uses this; the participants
   *  tab embeds inside its own card and disables it. Default true. */
  withCard?: boolean;
}

export function ParticipantScopePicker({
  value,
  onChange,
  employees,
  hubs,
  departments,
  teams,
  featureHubs = false,
  withCard = true,
}: Props) {
  const t = useTranslations("dashboard.climate.wizard.participants_step");

  const toggleScopeId = (id: string) => {
    const has = value.scopeIds.includes(id);
    onChange({
      ...value,
      scopeIds: has
        ? value.scopeIds.filter((x) => x !== id)
        : [...value.scopeIds, id],
    });
  };

  const toggleParticipant = (id: string) => {
    const has = value.participantIds.includes(id);
    onChange({
      ...value,
      participantIds: has
        ? value.participantIds.filter((x) => x !== id)
        : [...value.participantIds, id],
    });
  };

  const body = (
    <>
      <div className="space-y-2">
        <Label>{t("scope_label")}</Label>
        <Select
          value={value.scope}
          onValueChange={(v) =>
            onChange({
              scope: v as ParticipantScope,
              scopeIds: [],
              participantIds: [],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("scope_all")}</SelectItem>
            {featureHubs && (
              <SelectItem value="HUB">{t("scope_hub")}</SelectItem>
            )}
            <SelectItem value="DEPARTMENT">{t("scope_department")}</SelectItem>
            <SelectItem value="TEAM">{t("scope_team")}</SelectItem>
            <SelectItem value="CUSTOM">{t("scope_custom")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {value.scope === "ALL" && t("scope_all_hint")}
          {value.scope === "HUB" && t("scope_hub_hint")}
          {value.scope === "DEPARTMENT" && t("scope_department_hint")}
          {value.scope === "TEAM" && t("scope_team_hint")}
          {value.scope === "CUSTOM" && t("scope_custom_hint")}
        </p>
      </div>

      {value.scope === "HUB" && (
        <ScopeChecklist
          items={hubs}
          selectedIds={value.scopeIds}
          onToggle={toggleScopeId}
          emptyLabel={t("no_hubs")}
        />
      )}
      {value.scope === "DEPARTMENT" && (
        <ScopeChecklist
          items={departments}
          selectedIds={value.scopeIds}
          onToggle={toggleScopeId}
          emptyLabel={t("no_departments")}
        />
      )}
      {value.scope === "TEAM" && (
        <ScopeChecklist
          items={teams}
          selectedIds={value.scopeIds}
          onToggle={toggleScopeId}
          emptyLabel={t("no_teams")}
        />
      )}

      {value.scope === "CUSTOM" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {t("selected_count", {
                selected: value.participantIds.length,
                total: employees.length,
              })}
            </Badge>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...value,
                    participantIds: employees.map((e) => e.id),
                  })
                }
              >
                {t("select_all")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...value, participantIds: [] })}
              >
                {t("clear")}
              </Button>
            </div>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3">
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("no_employees")}
              </p>
            ) : (
              employees.map((employee) => {
                const isSelected = value.participantIds.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleParticipant(employee.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleParticipant(employee.id);
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors",
                      isSelected
                        ? "border border-primary/30 bg-primary/10"
                        : "hover:bg-muted",
                    )}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {employee.name
                        ? employee.name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {employee.name || employee.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {employee.title || t("no_title")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );

  if (!withCard) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}

function ScopeChecklist({
  items,
  selectedIds,
  onToggle,
  emptyLabel,
}: {
  items: NamedOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onToggle(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(item.id);
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors",
              isSelected ? "border border-primary/30 bg-primary/10" : "hover:bg-muted",
            )}
          >
            <Checkbox checked={isSelected} />
            <span className="text-sm">{item.name}</span>
          </div>
        );
      })}
    </div>
  );
}
