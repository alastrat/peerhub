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

export type DomainInput = z.infer<typeof domainSchema>;
export type UpdateGlobalRoleInput = z.infer<typeof updateGlobalRoleSchema>;
export type CreatePlatformCompanyInput = z.infer<typeof createPlatformCompanySchema>;
