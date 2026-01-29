import { z } from "zod";

export const questionConfigSchema = z.object({
  scale: z
    .object({
      min: z.number().min(1),
      max: z.number().max(10),
      labels: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  options: z.array(z.string()).optional(),
  maxLength: z.number().optional(),
  placeholder: z.string().optional(),
});

export const templateQuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Question text is required"),
  description: z.string().optional(),
  type: z.enum(["RATING", "TEXT", "COMPETENCY_RATING", "MULTIPLE_CHOICE"]),
  isRequired: z.boolean().default(true),
  order: z.number(),
  config: questionConfigSchema.optional(),
  competencyId: z.string().optional(),
});

export const templateSectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Section title is required"),
  description: z.string().optional(),
  order: z.number(),
  reviewerTypes: z.array(
    z.enum(["SELF", "MANAGER", "PEER", "DIRECT_REPORT", "EXTERNAL"])
  ),
  questions: z.array(templateQuestionSchema),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  sections: z.array(templateSectionSchema).min(1, "At least one section is required"),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").optional(),
  description: z.string().optional().nullable(),
  sections: z.array(templateSectionSchema).optional(),
  isArchived: z.boolean().optional(),
});

export type QuestionConfig = z.infer<typeof questionConfigSchema>;
export type TemplateQuestion = z.infer<typeof templateQuestionSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
