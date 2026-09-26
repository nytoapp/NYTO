import { z } from "zod";
import { attributionSchema, catalogKinds, parsedIntentSchema, resolvedTimeSchema } from "./intent";

export const searchContextSchema = z
  .object({
    device: z
      .object({
        latitude: z.number().gte(-90).lte(90),
        longitude: z.number().gte(-180).lte(180),
      })
      .strict()
      .nullable(),
    selectedLocationId: z.string().uuid().nullable(),
    tripId: z.string().uuid().nullable(),
  })
  .strict();

export const searchRequestSchema = z
  .object({
    query: z.string().max(300),
    locale: z.string().min(2).max(35).default("en"),
    context: searchContextSchema,
  })
  .strict();

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const searchResultSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(catalogKinds),
    title: z.string(),
    summary: z.string().nullable(),
    factSource: z.enum(["catalog", "provider"]),
    provider: z.string().nullable(),
    state: z.enum(["ok", "unavailable", "stale", "unknown"]),
    attribution: z.array(attributionSchema),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .strict()
      .nullable(),
    distanceMeters: z.number().nullable(),
    destination: z
      .object({
        id: z.string().min(1),
        label: z.string().min(1),
      })
      .strict()
      .nullable(),
    reasons: z.array(z.string()),
  })
  .strict();

export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResponseSchema = z
  .object({
    results: z.array(searchResultSchema),
    interpretation: parsedIntentSchema.nullable(),
    resolvedTime: resolvedTimeSchema.nullable(),
    locationLabel: z.string().nullable(),
    relaxed: z.array(z.string()),
    notices: z.array(z.object({ code: z.string(), message: z.string() }).strict()),
  })
  .strict();

export type SearchResponse = z.infer<typeof searchResponseSchema>;

export const destinationResolveRequestSchema = z
  .object({
    destinationId: z.string().min(8).max(2000),
  })
  .strict();

export const destinationResolveResponseSchema = z
  .object({
    label: z.string(),
    preferredUrl: z.string().url(),
    fallbackUrl: z.string().url(),
  })
  .strict();

export type DestinationResolveResponse = z.infer<typeof destinationResolveResponseSchema>;

export const geoCandidateSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string(),
    countryCode: z.string().length(2),
    timezone: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  })
  .strict();

export type GeoCandidate = z.infer<typeof geoCandidateSchema>;

export const subjectDetailSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(catalogKinds),
    title: z.string(),
    summary: z.string().nullable(),
    locale: z.string(),
    countryCode: z.string().length(2).nullable(),
    timezone: z.string().nullable(),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .strict()
      .nullable(),
    factSource: z.literal("catalog"),
    attribution: z.array(attributionSchema),
  })
  .strict();

export type SubjectDetail = z.infer<typeof subjectDetailSchema>;

export const homeRailSchema = z
  .object({
    key: z.enum(["happening_now", "popular_nearby", "weekend", "continue"]),
    title: z.string(),
    items: z.array(searchResultSchema),
  })
  .strict();

export const homeResponseSchema = z
  .object({
    locationLabel: z.string().nullable(),
    timezone: z.string().nullable(),
    explore: z.array(z.object({ slug: z.string(), label: z.string() }).strict()).max(6),
    rails: z.array(homeRailSchema).max(3),
  })
  .strict();

export type HomeResponse = z.infer<typeof homeResponseSchema>;

export const saveRequestSchema = z
  .object({
    subjectId: z.string().uuid(),
    occurrenceId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const tripCreateRequestSchema = z
  .object({
    destinationLocationId: z.string().uuid(),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().min(1).max(120).nullable().optional(),
    partySize: z.number().int().min(1).max(50).nullable().optional(),
  })
  .strict();

export const tripItemRequestSchema = z
  .object({
    subjectId: z.string().uuid(),
    occurrenceId: z.string().uuid().nullable().optional(),
    slot: z.enum(["morning", "lunch", "afternoon", "dinner", "night", "unscheduled"]),
    tripDayId: z.string().uuid().nullable().optional(),
    localTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();

export const phoneStartRequestSchema = z
  .object({
    phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  })
  .strict();

export const phoneVerifyRequestSchema = z
  .object({
    phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
    code: z.string().regex(/^\d{6}$/),
    device: z
      .object({
        platform: z.enum(["ios", "android", "web"]),
        label: z.string().max(80).nullable().optional(),
      })
      .strict(),
  })
  .strict();

export const emailRegisterRequestSchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(12).max(200),
    device: phoneVerifyRequestSchema.shape.device,
  })
  .strict();

export const emailVerifyRequestSchema = z
  .object({
    email: z.string().email().max(320),
    code: z.string().regex(/^\d{6}$/),
    device: phoneVerifyRequestSchema.shape.device,
  })
  .strict();

export const emailLoginRequestSchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(200),
    device: phoneVerifyRequestSchema.shape.device,
  })
  .strict();

export const oauthRequestSchema = z
  .object({
    idToken: z.string().min(20),
    nonce: z.string().min(8).max(200),
    device: phoneVerifyRequestSchema.shape.device,
  })
  .strict();

export const refreshRequestSchema = z
  .object({
    refreshToken: z.string().min(20),
  })
  .strict();

export const authSessionSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresInSeconds: z.number().int(),
    userId: z.string().uuid(),
  })
  .strict();

export type AuthSession = z.infer<typeof authSessionSchema>;

export const challengeStartedSchema = z
  .object({
    challengeId: z.string().uuid(),
    expiresInSeconds: z.number().int(),
  })
  .strict();
