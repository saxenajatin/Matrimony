import { z } from "zod";

import { REPORT_REASON_OPTIONS } from "@/lib/constants/interactions";

const reasonValues = REPORT_REASON_OPTIONS.map((item) => item.value) as [
  string,
  ...string[],
];

export const sendInterestSchema = z.object({
  targetUserId: z.string().uuid(),
  message: z
    .string()
    .trim()
    .max(500, "Message must be 500 characters or less")
    .optional()
    .or(z.literal("")),
});

export const reportUserSchema = z.object({
  reportedUserId: z.string().uuid(),
  reasonCode: z.enum(reasonValues as [string, ...string[]]),
  details: z
    .string()
    .trim()
    .max(1000, "Details must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
});

export const resolveReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["resolved", "dismissed", "reviewing"]),
  resolutionNotes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal("")),
});

export type SendInterestInput = z.infer<typeof sendInterestSchema>;
export type ReportUserInput = z.infer<typeof reportUserSchema>;
