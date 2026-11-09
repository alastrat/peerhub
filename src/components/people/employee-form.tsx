"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
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
import { addEmployeeSchema, type AddEmployeeInput } from "@/lib/validations/user";
import { addEmployee } from "@/lib/actions/users";
import type { Department, Employee, Hub } from "@prisma/client";
import { DemographicFields } from "./demographic-fields";
import { JobFields } from "./job-fields";

const ROLE_OPTIONS = [
  { value: "ADMIN", key: "admin" },
  { value: "MANAGER", key: "manager" },
  { value: "MEMBER", key: "member" },
] as const;

interface EmployeeFormProps {
  departments: Department[];
  managers: Employee[];
  hubs?: Hub[];
  showHubs?: boolean;
}

/**
 * Add one employee: the same fields, in the same order, as a row of the
 * employee import (Kultiva's template), with the same optional invitation.
 */
export function EmployeeForm({
  departments,
  managers,
  hubs = [],
  showHubs = false,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("dashboard.employeeForm");
  // The people table's role names, so a role reads the same in both places
  const tRoles = useTranslations("dashboard.people");

  const schema = useMemo(
    () =>
      addEmployeeSchema({
        nationalIdRequired: t("nationalIdRequired"),
        nameTooShort: t("nameTooShort"),
        emailInvalid: t("emailInvalid"),
      }),
    [t],
  );
  const form = useForm<AddEmployeeInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      nationalId: "",
      name: "",
      email: "",
      title: "",
      // Off by default, as in the import: adding someone sends them nothing unless asked
      invite: false,
      role: "MEMBER",
    },
  });
  const invite = useWatch({ control: form.control, name: "invite" });
  // Without an email there's nobody to invite: they answer surveys from a link
  const email = useWatch({ control: form.control, name: "email" });
  const hasEmail = typeof email === "string" && email.trim() !== "";

  function onSubmit(data: AddEmployeeInput) {
    startTransition(async () => {
      const result = await addEmployee(hasEmail ? data : { ...data, invite: false });

      if (result.success) {
        toast.success(result.data?.invited ? t("employeeAddedInvited") : t("employeeAdded"));
        if (result.warning) {
          toast.warning(result.warning);
        }
        router.push("/people");
        router.refresh();
      } else {
        toast.error(result.error || t("somethingWrong"));
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <JobFields control={form.control} fields={["nationalId"]} />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fullName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("namePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("emailAddress")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    {...field}
                    value={(field.value as string | undefined) ?? ""}
                  />
                </FormControl>
                <FormDescription>{t("createEmailDesc")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <JobFields control={form.control} fields={["phone"]} />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("jobTitle")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("titlePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showHubs && (
            <FormField
              control={form.control}
              name="hubId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("hub")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={(field.value as string | null | undefined) ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectHub")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("noHub")}</SelectItem>
                      {hubs.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("department")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={(field.value as string | null | undefined) ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectDepartment")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">{t("noDepartment")}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="managerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("manager")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={(field.value as string | null | undefined) ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectManager")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">{t("noManager")}</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name || manager.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <JobFields control={form.control} fields={["jobLevel"]} />
        </div>

        <DemographicFields control={form.control} />

        <div className="space-y-4 rounded-lg border p-4">
          <FormField
            control={form.control}
            name="invite"
            render={({ field }) => (
              <FormItem>
                <label className="flex cursor-pointer items-start gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true && hasEmail}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={!hasEmail}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">{t("inviteLabel")}</span>
                    <span className="block text-sm text-muted-foreground">
                      {hasEmail ? t("inviteHint") : t("inviteNeedsEmail")}
                    </span>
                  </span>
                </label>
              </FormItem>
            )}
          />

          {/* The role only exists through the invitation, as in the import */}
          {invite && hasEmail && (
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="md:max-w-sm">
                  <FormLabel>{t("role")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectRole")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map(({ value, key }) => (
                        <SelectItem key={value} value={value}>
                          {tRoles(key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("roleDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("addEmployee")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
