
import { z } from "zod";

export const incidentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  category: z.enum([
    "missed_pickup",
    "late_collection",
    "quantity_mismatch",
    "quality_concern",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  occurred_at: z.string().datetime({ offset: true }),
});

export type IncidentInput = z.infer<typeof incidentSchema>;
