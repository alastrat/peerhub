import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  employeeId: z.string().optional(),
  startDate: z.coerce.date().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  title: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  employeeId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
});

export const bulkInviteSchema = z.object({
  invitations: z.array(inviteUserSchema).min(1, "At least one invitation required"),
});

export const csvImportRowSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  title: z.string().optional(),
  department: z.string().optional(),
  managerEmail: z.string().email().optional(),
  employeeId: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  startDate: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
export type CSVImportRow = z.infer<typeof csvImportRowSchema>;
