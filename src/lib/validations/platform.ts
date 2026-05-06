import { z } from "zod";

export const domainSchema = z
  .string()
  .min(3, "Domain must be at least 3 characters")
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/,
    "Invalid domain format (e.g. example.com)"
  )
  .transform((v) => v.toLowerCase());

export const updateGlobalRoleSchema = z.object({
  userId: z.string().min(1),
  globalRole: z.enum(["SUPER_ADMIN", "USER"]),
});

export const createPlatformCompanySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});

// Same as above plus an admin email — used by the new SUPER_ADMIN flow that
// creates a company AND sends an invite to its first ADMIN in one step.
export const createPlatformCompanyWithAdminSchema = createPlatformCompanySchema.extend({
  adminEmail: z.string().email("Enter a valid email address"),
});

// Personal info collected on the onboarding step before company creation.
// Phone is optional; when provided it must be E.164 (validated by the
// react-phone-number-input library client-side, double-checked here).
export const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number with country code")
    .optional()
    .or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
});

export type DomainInput = z.infer<typeof domainSchema>;
export type UpdateGlobalRoleInput = z.infer<typeof updateGlobalRoleSchema>;
export type CreatePlatformCompanyInput = z.infer<typeof createPlatformCompanySchema>;
export type CreatePlatformCompanyWithAdminInput = z.infer<typeof createPlatformCompanyWithAdminSchema>;
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
