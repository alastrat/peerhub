import { z } from "zod";

export const createCycleSchema = z
  .object({
    name: z.string().min(1, "Cycle name is required"),
    description: z.string().optional(),
    templateId: z.string().min(1, "Template is required"),

    // Timeline
    nominationStartDate: z.coerce.date().optional(),
    nominationEndDate: z.coerce.date().optional(),
    reviewStartDate: z.coerce.date(),
    reviewEndDate: z.coerce.date(),

    // Reviewer types
    selfReviewEnabled: z.boolean().default(true),
    managerReviewEnabled: z.boolean().default(true),
    peerReviewEnabled: z.boolean().default(true),
    directReportEnabled: z.boolean().default(false),
    externalEnabled: z.boolean().default(false),

    // Peer settings
    minPeers: z.number().min(0).max(20).default(3),
    maxPeers: z.number().min(1).max(20).default(8),
    anonymityThreshold: z.number().min(1).max(10).default(3),

    // Nomination settings
    employeeNominatePeers: z.boolean().default(true),
    managerApprovePeers: z.boolean().default(true),

    // Participants
    participantIds: z.array(z.string()).optional(),
  })
  .refine((data) => data.reviewEndDate > data.reviewStartDate, {
    message: "End date must be after start date",
    path: ["reviewEndDate"],
  })
  .refine((data) => data.maxPeers >= data.minPeers, {
    message: "Max peers must be greater than or equal to min peers",
    path: ["maxPeers"],
  });

export const updateCycleSchema = z.object({
  name: z.string().min(1, "Cycle name is required").optional(),
  description: z.string().optional().nullable(),
  nominationStartDate: z.coerce.date().optional().nullable(),
  nominationEndDate: z.coerce.date().optional().nullable(),
  reviewStartDate: z.coerce.date().optional(),
  reviewEndDate: z.coerce.date().optional(),
  selfReviewEnabled: z.boolean().optional(),
  managerReviewEnabled: z.boolean().optional(),
  peerReviewEnabled: z.boolean().optional(),
  directReportEnabled: z.boolean().optional(),
  externalEnabled: z.boolean().optional(),
  minPeers: z.number().min(0).max(20).optional(),
  maxPeers: z.number().min(1).max(20).optional(),
  anonymityThreshold: z.number().min(1).max(10).optional(),
  employeeNominatePeers: z.boolean().optional(),
  managerApprovePeers: z.boolean().optional(),
});

export const addParticipantsSchema = z.object({
  cycleId: z.string(),
  userIds: z.array(z.string()).min(1, "At least one participant is required"),
});

export const launchCycleSchema = z.object({
  cycleId: z.string(),
  sendEmails: z.boolean().default(true),
});

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;
export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>;
export type LaunchCycleInput = z.infer<typeof launchCycleSchema>;
