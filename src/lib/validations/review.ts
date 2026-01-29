import { z } from "zod";

export const reviewResponseSchema = z.object({
  questionId: z.string(),
  ratingValue: z.number().min(1).max(10).optional().nullable(),
  textValue: z.string().optional().nullable(),
  selectedOptions: z.array(z.string()).optional(),
});

export const saveReviewProgressSchema = z.object({
  assignmentId: z.string(),
  responses: z.array(reviewResponseSchema),
});

export const submitReviewSchema = z.object({
  assignmentId: z.string(),
  responses: z.array(reviewResponseSchema),
});

export const declineReviewSchema = z.object({
  assignmentId: z.string(),
  reason: z.string().optional(),
});

export const tokenReviewSchema = z.object({
  token: z.string(),
  responses: z.array(reviewResponseSchema),
});

export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;
export type SaveReviewProgressInput = z.infer<typeof saveReviewProgressSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type DeclineReviewInput = z.infer<typeof declineReviewSchema>;
export type TokenReviewInput = z.infer<typeof tokenReviewSchema>;
