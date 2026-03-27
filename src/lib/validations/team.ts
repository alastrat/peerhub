import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  hubId: z.string().optional(),
  departmentId: z.string().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  hubId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

export const addTeamMemberSchema = z.object({
  employeeId: z.string().min(1),
  role: z.enum(["LEAD", "MEMBER"]).default("MEMBER"),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
