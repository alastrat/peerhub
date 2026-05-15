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

// Tax / legal identifier (NIT in Colombia, VAT/EIN elsewhere). Required, but
// kept format-agnostic since the same field serves tenants in multiple
// jurisdictions. We accept alphanumerics + the separators that show up in
// real-world formats (dash, dot, slash, space).
export const taxIdSchema = z
  .string()
  .trim()
  .min(5, "Tax ID must be at least 5 characters")
  .max(32, "Tax ID is too long")
  .regex(/^[A-Za-z0-9.\-/ ]+$/, "Invalid characters in tax ID");

export const createPlatformCompanySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  taxId: taxIdSchema,
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

// Used by the SUPER_ADMIN "Crear cuenta" flow that bootstraps an entire
// tenant — Company row + Invitation for the first ADMIN — in one transaction.
// The admin sub-object pre-fills User + Employee fields when the invite is
// accepted; the invitee can edit them afterwards from /settings/profile.
export const createPlatformCompanyWithAdminSchema = createPlatformCompanySchema.extend({
  // Company-level extras (all schema-default-friendly nullable).
  logo: z.string().url("Enter a valid logo URL").optional().or(z.literal("")),
  domain: domainSchema.optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color (e.g. #613171)")
    .optional()
    .or(z.literal("")),
  locale: z.enum(["es", "en"]).default("es"),
  featureAts: z.boolean().default(false),
  featureOnboarding: z.boolean().default(false),
  featureWorkEnv: z.boolean().default(true),
  featureHubs: z.boolean().default(false),
  // Admin profile — composes personalInfoSchema and adds email.
  admin: personalInfoSchema.extend({
    email: z.string().email("Enter a valid email address"),
  }),
});

export type DomainInput = z.infer<typeof domainSchema>;
export type UpdateGlobalRoleInput = z.infer<typeof updateGlobalRoleSchema>;
export type CreatePlatformCompanyInput = z.infer<typeof createPlatformCompanySchema>;
export type CreatePlatformCompanyWithAdminInput = z.infer<typeof createPlatformCompanyWithAdminSchema>;
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
