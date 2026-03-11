import { z } from "zod";

// Employee-specific fields (org-chart data on the Employee model)
export const employeeFieldsSchema = z.object({
  title: z.string().optional().nullable(),
  employeeCode: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
});

// Create user: creates both a CompanyUser (platform access) and an Employee (org-chart)
export const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
  // Employee fields
  title: z.string().optional(),
  employeeCode: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  startDate: z.coerce.date().optional(),
});

// Update user: CompanyUser fields (role, isActive) + Employee fields (title, dept, etc.)
export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  isActive: z.boolean().optional(),
  // Employee fields
  title: z.string().optional().nullable(),
  employeeCode: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
});

// Update employee details only (org-chart fields on the Employee model)
export const updateEmployeeDetailsSchema = z.object({
  title: z.string().optional().nullable(),
  employeeCode: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
});

export const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
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
  employeeCode: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  startDate: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateEmployeeDetailsInput = z.infer<typeof updateEmployeeDetailsSchema>;
export type EmployeeFields = z.infer<typeof employeeFieldsSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
export type CSVImportRow = z.infer<typeof csvImportRowSchema>;
