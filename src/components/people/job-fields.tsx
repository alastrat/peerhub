"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_LEVELS } from "@/lib/constants/job-levels";

/** Cédula and job level ("Nivel jerárquico"), as in Kultiva's import format. Renders two grid cells. */
export function JobFields<T extends FieldValues>({ control }: { control: Control<T> }) {
  const t = useTranslations("employee_fields");
  return (
    <>
      <FormField
        control={control}
        name={"nationalId" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("national_id")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("national_id_placeholder")}
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"jobLevel" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("job_level")}</FormLabel>
            <Select onValueChange={field.onChange} value={(field.value as string) || "none"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">{t("not_set")}</SelectItem>
                {JOB_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {t(`job_level_values.${level}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
