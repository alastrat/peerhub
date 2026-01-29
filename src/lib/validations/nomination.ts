import { z } from "zod";

export const createNominationSchema = z.object({
  cycleId: z.string(),
  nomineeIds: z.array(z.string()).min(1, "At least one nominee is required"),
});

export const approveNominationSchema = z.object({
  nominationId: z.string(),
});

export const rejectNominationSchema = z.object({
  nominationId: z.string(),
  reason: z.string().optional(),
});

export const bulkApproveNominationsSchema = z.object({
  nominationIds: z.array(z.string()).min(1),
});

export const addExternalRaterSchema = z.object({
  cycleId: z.string(),
  revieweeId: z.string(),
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Name is required"),
});

export type CreateNominationInput = z.infer<typeof createNominationSchema>;
export type ApproveNominationInput = z.infer<typeof approveNominationSchema>;
export type RejectNominationInput = z.infer<typeof rejectNominationSchema>;
export type BulkApproveNominationsInput = z.infer<typeof bulkApproveNominationsSchema>;
export type AddExternalRaterInput = z.infer<typeof addExternalRaterSchema>;
