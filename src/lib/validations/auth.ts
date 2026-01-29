import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export const companySetupSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  slug: z
    .string()
    .min(2, "URL must be at least 2 characters")
    .max(50, "URL must be less than 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "URL can only contain lowercase letters, numbers, and hyphens"
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CompanySetupInput = z.infer<typeof companySetupSchema>;
