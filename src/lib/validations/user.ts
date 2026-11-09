import { z } from "zod";
import { GENDERS } from "@/lib/constants/demographics";
import { JOB_LEVELS } from "@/lib/constants/job-levels";
import { normalizeNationalId } from "@/lib/utils/employee-import";
import { normalizePhone } from "@/lib/people/phone";

// Empty form values ("" / "none") clear the field
const genderSchema = z.preprocess(
  (v) => (v === "" || v === "none" ? null : v),
  z.enum(GENDERS).nullable().optional(),
);
const optionalDateSchema = z.preprocess((v) => (v === "" ? null : v), z.coerce.date().nullable().optional());
const jobLevelSchema = z.preprocess(
  (v) => (v === "" || v === "none" ? null : v),
  z.enum(JOB_LEVELS).nullable().optional(),
);
// Cédula, stored the way the import compares it; blank clears it
const nationalIdSchema = z.preprocess(
  (v) => (typeof v === "string" ? normalizeNationalId(v) || null : v),
  z.string().max(30).nullable().optional(),
);

// Mobile number, stored normalized ("+57 300 123 4567" → "+573001234567"); blank clears it
const phoneSchema = (message?: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : (normalizePhone(v) ?? v)) : v),
    z.string().regex(/^\+?\d{7,15}$/, message).nullable().optional(),
  );
// Optional email: blank means the person has none
const optionalEmailSchema = (message?: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().toLowerCase().email(message).optional(),
  );

// Employee-specific fields (org-chart data on the Employee model)
export const employeeFieldsSchema = z.object({
  title: z.string().optional().nullable(),
  employeeCode: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  hubId: z.string().optional().nullable(),
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
  hubId: z.string().optional(),
  startDate: optionalDateSchema,
  gender: genderSchema,
  birthDate: optionalDateSchema,
  nationalId: nationalIdSchema,
  jobLevel: jobLevelSchema,
});

// Update an employee from the People edit page (by Employee id). Works for
// people with and without platform access; role/isActive also update the
// linked CompanyUser when there is one.
export const updateEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  isActive: z.boolean().optional(),
  title: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  hubId: z.string().optional().nullable(),
  startDate: optionalDateSchema,
  gender: genderSchema,
  birthDate: optionalDateSchema,
  nationalId: nationalIdSchema,
  jobLevel: jobLevelSchema,
  phone: phoneSchema(),
  // Only for someone without one yet: an email can't be changed once set
  email: optionalEmailSchema(),
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
  hubId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
});

// Update employee details only (org-chart fields on the Employee model)
export const updateEmployeeDetailsSchema = z.object({
  title: z.string().optional().nullable(),
  employeeCode: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  hubId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
});

// Empty selects ("" / "none") mean no selection
const optionalIdSchema = z.preprocess(
  (v) => (v === "" || v === "none" ? null : v),
  z.string().nullable().optional(),
);

/**
 * Add employee form: the same fields and rules as one row of the employee
 * import (Kultiva's format). The form passes its translated messages.
 */
export function addEmployeeSchema(
  messages: { nationalIdRequired?: string; nameTooShort?: string; emailInvalid?: string; phoneInvalid?: string } = {},
) {
  return z.object({
    nationalId: z.preprocess(
      (v) => (typeof v === "string" ? normalizeNationalId(v) : v),
      z.string().min(1, messages.nationalIdRequired).max(30),
    ),
    name: z.string().trim().min(2, messages.nameTooShort),
    // Without an email they get no invitation or email, and answer surveys
    // from a personal link
    email: optionalEmailSchema(messages.emailInvalid),
    phone: phoneSchema(messages.phoneInvalid),
    title: z.string().trim().optional(),
    hubId: optionalIdSchema,
    departmentId: optionalIdSchema,
    managerId: optionalIdSchema,
    startDate: optionalDateSchema,
    gender: genderSchema,
    birthDate: optionalDateSchema,
    jobLevel: jobLevelSchema,
    // As in the import, platform access comes only with an emailed invitation
    invite: z.boolean().default(false),
    role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
  });
}

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
  email: z.string().email().optional(),
  phone: phoneSchema(),
  name: z.string().min(1),
  title: z.string().optional(),
  department: z.string().optional(),
  managerEmail: z.string().email().optional(),
  employeeCode: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  startDate: z.string().optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
  // Kultiva's import format
  nationalId: z.string().min(1).optional(),
  hub: z.string().optional(),
  managerNationalId: z.string().optional(),
  managerName: z.string().optional(),
  jobLevel: z.string().optional(),
  // Email a platform invitation once the employee is created
  invite: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateEmployeeInput = z.input<typeof updateEmployeeSchema>;
export type UpdateEmployeeDetailsInput = z.infer<typeof updateEmployeeDetailsSchema>;
export type EmployeeFields = z.infer<typeof employeeFieldsSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
export type CSVImportRow = z.infer<typeof csvImportRowSchema>;
export type AddEmployeeInput = z.input<ReturnType<typeof addEmployeeSchema>>;
