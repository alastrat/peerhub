"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user";
import { inviteUser, createUser } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { Department, Employee, Hub } from "@prisma/client";

interface EmployeeFormProps {
  departments: Department[];
  managers: Employee[];
  hubs?: Hub[];
  featureHubs?: boolean;
  mode?: "invite" | "create";
}

export function EmployeeForm({
  departments,
  managers,
  hubs = [],
  featureHubs = false,
  mode = "invite",
}: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("dashboard.employeeForm");

  const form = useForm<CreateUserInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: {
      email: "",
      name: "",
      title: "",
      role: "MEMBER",
      departmentId: undefined,
      managerId: undefined,
    },
  });

  function onSubmit(data: CreateUserInput) {
    startTransition(async () => {
      const result =
        mode === "invite"
          ? await inviteUser({
              email: data.email,
              role: data.role,
              departmentId: data.departmentId,
              managerId: data.managerId,
            })
          : await createUser(data);

      if (result.success) {
        toast.success(
          mode === "invite"
            ? t("invitationSent")
            : t("employeeAdded")
        );
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
                  />
                </FormControl>
                <FormDescription>
                  {mode === "invite"
                    ? t("inviteEmailDesc")
                    : t("createEmailDesc")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("role")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t("roleDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("department")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
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
                  defaultValue={field.value}
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

          {featureHubs && (
            <FormField
              control={form.control}
              name="hubId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("hub")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
            {mode === "invite" ? t("sendInvitation") : t("addEmployee")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
