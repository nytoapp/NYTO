import { z } from "zod";

export const catalogKinds = ["place", "accommodation", "event", "experience", "activity", "media"] as const;
export type CatalogKind = (typeof catalogKinds)[number];

export const timeOfDayValues = ["morning", "afternoon", "evening", "night"] as const;

const civilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const intentLocationSchema = z
  .object({
    mode: z.enum(["near_me", "text", "selected", "trip", "unresolved"]),
    text: z.string().max(120).nullable(),
  })
  .strict();

export const timeWindowSchema = z
  .object({
    kind: z.enum(["none", "tonight", "weekend", "weekday"]),
    weekday: z.number().int().min(1).max(7).nullable(),
    timeOfDay: z.enum(timeOfDayValues).nullable(),
  })
  .strict();

export const budgetConstraintSchema = z
  .object({
    amountMinor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    basis: z.enum(["total", "per_person", "per_night"]),
  })
  .strict();

/**
 * Interpreter output. Coordinates, prices, addresses, hours, availability,
 * ratings, and URLs are not fields. Strict mode rejects them.
 */
export const parsedIntentSchema = z
  .object({
    schemaVersion: z.literal(1),
    interpreter: z.enum(["rules", "llm", "fallback"]),
    confidence: z.number().min(0).max(1),
    queryLanguage: z.string().min(2).max(35),
    task: z.enum(["search", "discover"]),
    kinds: z.array(z.enum(catalogKinds)).max(6),
    categorySlugs: z.array(z.string().min(1).max(80)).max(8),
    tagSlugs: z.array(z.string().min(1).max(80)).max(8),
    freeText: z.string().max(300),
    location: intentLocationSchema,
    radiusMeters: z.number().int().positive().max(100_000).nullable(),
    timeWindow: timeWindowSchema,
    partySize: z.number().int().min(1).max(50).nullable(),
    budget: budgetConstraintSchema.nullable(),
    preferences: z.array(z.string().min(1).max(40)).max(8),
  })
  .strict();

export type ParsedIntent = z.infer<typeof parsedIntentSchema>;

export const resolvedTimeSchema = z
  .object({
    dateFrom: civilDate.nullable(),
    dateTo: civilDate.nullable(),
    timeOfDay: z.enum(timeOfDayValues).nullable(),
  })
  .strict();

export type ResolvedTime = z.infer<typeof resolvedTimeSchema>;

export const attributionSchema = z
  .object({
    provider: z.string().min(1),
    text: z.string().min(1),
    required: z.boolean(),
  })
  .strict();

export type AttributionBlock = z.infer<typeof attributionSchema>;

export const pageRequestSchema = z
  .object({
    cursor: z.string().min(1).max(200).nullable().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();

export type PageRequest = z.infer<typeof pageRequestSchema>;
