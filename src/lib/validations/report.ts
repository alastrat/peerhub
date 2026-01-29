import { z } from "zod";

export const exportOptionsSchema = z.object({
  format: z.enum(["csv", "pdf"]),
  includeTextResponses: z.boolean().default(true),
  includeRatings: z.boolean().default(true),
  includeCharts: z.boolean().default(false),
  anonymize: z.boolean().default(true),
});

export type ExportOptions = z.infer<typeof exportOptionsSchema>;

export const releaseReportSchema = z.object({
  cycleId: z.string().cuid(),
  participantId: z.string().cuid(),
  sendEmail: z.boolean().default(true),
});

export type ReleaseReportInput = z.infer<typeof releaseReportSchema>;

export const releaseAllReportsSchema = z.object({
  cycleId: z.string().cuid(),
  sendEmails: z.boolean().default(true),
});

export type ReleaseAllReportsInput = z.infer<typeof releaseAllReportsSchema>;
