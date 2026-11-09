"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  FormControl,
  FormDescription,
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

/**
 * Cédula, job level ("Nivel jerárquico") and mobile number ("Celular"), as
 * in the employee import. One grid cell per field; `fields` picks which, so
 * a form can place them apart.
 */
export function JobFields<T extends FieldValues>({
  control,
  fields = ["nationalId", "jobLevel"],
}: {
  control: Control<T>;
  fields?: ("nationalId" | "jobLevel" | "phone")[];
}) {
  const t = useTranslations("employee_fields");
  return (
    <>
      {fields.includes("nationalId") && (
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
      )}
      {fields.includes("phone") && (
        <FormField
          control={control}
          name={"phone" as Path<T>}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t("phone")}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder={t("phone_placeholder")}
                  value={(field.value as string) ?? ""}
                  onChange={field.onChange}
                />
              </FormControl>
              {fieldState.error ? (
                <p className="text-sm font-medium text-destructive">{t("phone_invalid")}</p>
              ) : (
                <FormDescription>{t("phone_description")}</FormDescription>
              )}
            </FormItem>
          )}
        />
      )}
      {fields.includes("jobLevel") && (
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
      )}
    </>
  );
}
