import { z } from "zod";
import { catalogKinds } from "./intent";

export const adminMetricSchema = z
  .object({
    key: z.enum(["places", "events", "providers", "users", "searches", "saves", "trips"]),
    label: z.string().min(1),
    value: z.number().int().nonnegative().nullable(),
    availability: z.enum(["live", "unavailable"]),
    note: z.string().nullable(),
  })
  .strict();

export const adminOverviewSchema = z
  .object({
    generatedAt: z.string().min(1),
    sourceNote: z.string().min(1),
    metrics: z.array(adminMetricSchema).length(7),
    categories: z
      .array(
        z
          .object({
            slug: z.string(),
            label: z.string(),
            subjectCount: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(8),
    recentSubjects: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            kind: z.enum(catalogKinds),
            title: z.string(),
            createdAt: z.string().min(1),
          })
          .strict(),
      )
      .max(8),
    providers: z
      .array(
        z
          .object({
            code: z.string(),
            name: z.string(),
            status: z.enum(["active", "disabled"]),
            latencyMs: z.null(),
            lastSuccessAt: z.null(),
            telemetry: z.literal("unavailable"),
          })
          .strict(),
      )
      .max(50),
    activity: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            occurredAt: z.string().min(1),
            action: z.string(),
            targetType: z.string(),
          })
          .strict(),
      )
      .max(12),
    alerts: z
      .array(
        z
          .object({
            code: z.string(),
            severity: z.enum(["attention"]),
            message: z.string(),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export type AdminMetric = z.infer<typeof adminMetricSchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
