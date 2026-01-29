"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { updateUserSchema, type UpdateUserInput } from "@/lib/validations/user";
import { updateUser, deleteUser } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/constants/roles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Department, CompanyUser, User } from "@prisma/client";

type CompanyUserWithRelations = CompanyUser & {
  user: User;
  department: Department | null;
  manager: (CompanyUser & { user: User }) | null;
};

type CompanyUserWithUser = CompanyUser & { user: User };

interface EditEmployeeFormProps {
  employee: CompanyUserWithRelations;
  departments: Department[];
  managers: CompanyUserWithUser[];
}

export function EditEmployeeForm({
  employee,
  departments,
  managers,
}: EditEmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateUserInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateUserSchema) as any,
    defaultValues: {
      name: employee.user.name || "",
      title: employee.title || "",
      role: employee.role,
      departmentId: employee.departmentId || undefined,
      managerId: employee.managerId || undefined,
      isActive: employee.isActive,
    },
  });

  function onSubmit(data: UpdateUserInput) {
    startTransition(async () => {
      // Clean up "none" values
      const cleanedData = {
        ...data,
        departmentId: data.departmentId === "none" ? null : data.departmentId,
        managerId: data.managerId === "none" ? null : data.managerId,
      };

      const result = await updateUser(employee.id, cleanedData);

      if (result.success) {
        toast.success("Employee updated successfully");
        router.push(`/people/${employee.id}`);
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    });
  }

  function handleDeactivate() {
    startTransition(async () => {
      const result = await deleteUser(employee.id);

      if (result.success) {
        toast.success("Employee deactivated successfully");
        router.push("/people");
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email address</label>
            <Input value={employee.user.email || ""} disabled />
            <p className="text-sm text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} value={field.value || ""} />
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
                <FormLabel>Job title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Software Engineer"
                    {...field}
                    value={field.value || ""}
                  />
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
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
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
                  Admins can manage all settings, Managers can view team reports
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
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
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
                <FormLabel>Manager</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.user.name || manager.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <FormDescription>
                  Inactive employees cannot access the system or participate in reviews
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={isPending}>
                Deactivate Employee
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
                <AlertDialogDescription>
                  This will deactivate {employee.user.name || "this employee"}'s account. They
                  will no longer be able to access the system or participate in reviews.
                  This action can be reversed by reactivating them later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate}>
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
