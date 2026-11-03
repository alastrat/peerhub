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
import { GENDERS } from "@/lib/constants/demographics";

/** Gender, date of birth and start date — feed climate demographic segments. */
export function DemographicFields<T extends FieldValues>({ control }: { control: Control<T> }) {
  const t = useTranslations("demographics");
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{t("fields.section_title")}</p>
        <p className="text-xs text-muted-foreground">{t("fields.privacy_hint")}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <FormField
          control={control}
          name={"gender" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.gender")}</FormLabel>
              <Select onValueChange={field.onChange} value={(field.value as string) || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{t("fields.not_set")}</SelectItem>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {t(`gender.${g}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"birthDate" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.birth_date")}</FormLabel>
              <FormControl>
                <Input type="date" value={(field.value as string) ?? ""} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"startDate" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.start_date")}</FormLabel>
              <FormControl>
                <Input type="date" value={(field.value as string) ?? ""} onChange={field.onChange} />
              </FormControl>
              <FormDescription className="sr-only">{t("fields.start_date")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
