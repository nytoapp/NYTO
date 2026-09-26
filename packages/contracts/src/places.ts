import { z } from "zod";

export const placeStatuses = ["draft", "active", "unavailable", "deleted"] as const;
export const placeWriteStatuses = ["draft", "active", "unavailable"] as const;
export const priceBases = ["per_person", "per_night", "total"] as const;

const clock = z.string().regex(/^\d{2}:\d{2}$/);

export const placePriceSchema = z
  .object({
    amountMinor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    basis: z.enum(priceBases),
  })
  .strict();

export const placeHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opensLocal: clock,
    closesLocal: clock,
    spansNextDay: z.boolean().default(false),
  })
  .strict();

export const placeMediaSchema = z
  .object({
    url: z.string().url().max(500),
    alt: z.string().max(160).nullable().optional(),
  })
  .strict();

export const placeProviderReferenceSchema = z
  .object({
    providerCode: z.string().trim().min(1).max(40),
    externalId: z.string().trim().min(1).max(200),
  })
  .strict();

export const placeAttributeSchema = z.record(
  z.string().trim().min(1).max(40),
  z.union([z.string().max(200), z.number().finite(), z.boolean()]),
);

export const placeWriteSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    summary: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(placeWriteStatuses).default("draft"),
    locale: z.string().trim().min(2).max(35).default("en"),
    categoryId: z.string().uuid(),
    subcategoryId: z.string().uuid().nullable().optional(),
    tagIds: z.array(z.string().uuid()).max(12).default([]),
    countryCode: z.string().trim().length(2),
    timezone: z.string().trim().min(1).max(64),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    streetLine: z.string().trim().max(200).nullable().optional(),
    locality: z.string().trim().max(120).nullable().optional(),
    adminArea: z.string().trim().max(120).nullable().optional(),
    postalCode: z.string().trim().max(32).nullable().optional(),
    phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/).nullable().optional(),
    websiteUrl: z.string().trim().url().max(500).nullable().optional(),
    price: placePriceSchema.nullable().optional(),
    hours: z.array(placeHourSchema).max(21).default([]),
    media: z.array(placeMediaSchema).max(8).default([]),
    attributes: placeAttributeSchema.default({}),
    providerReference: placeProviderReferenceSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value.attributes).length > 20) {
      context.addIssue({ code: "custom", path: ["attributes"], message: "Use at most 20 attributes." });
    }
    const seen = new Set<string>();
    for (const hour of value.hours) {
      if (!hour.spansNextDay && hour.closesLocal <= hour.opensLocal) {
        context.addIssue({ code: "custom", path: ["hours"], message: "Closing time must be after opening time, or mark the span." });
      }
      const key = `${hour.weekday}:${hour.opensLocal}`;
      if (seen.has(key)) {
        context.addIssue({ code: "custom", path: ["hours"], message: "Two opening windows cannot share a weekday and start time." });
      }
      seen.add(key);
    }
  });

export type PlaceWrite = z.infer<typeof placeWriteSchema>;

export const placeListQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    status: z.enum(placeStatuses).optional(),
    categoryId: z.string().uuid().optional(),
    countryCode: z.string().trim().length(2).optional(),
    locality: z.string().trim().max(120).optional(),
    includeArchived: z.boolean().default(false),
    sort: z.enum(["created_at", "updated_at", "name"]).default("created_at"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    limit: z.number().int().min(1).max(50).default(25),
    offset: z.number().int().min(0).max(5_000).default(0),
  })
  .strict();

export type PlaceListQuery = z.infer<typeof placeListQuerySchema>;

export const placeListItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.enum(placeStatuses),
    category: z.string().nullable(),
    locality: z.string().nullable(),
    countryCode: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const placeListResponseSchema = z
  .object({
    items: z.array(placeListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .strict();

export type PlaceListResponse = z.infer<typeof placeListResponseSchema>;
export type PlaceListItem = z.infer<typeof placeListItemSchema>;

export const placeDetailSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    summary: z.string().nullable(),
    status: z.enum(placeStatuses),
    locale: z.string(),
    archived: z.boolean(),
    categoryId: z.string().uuid().nullable(),
    subcategoryId: z.string().uuid().nullable(),
    tagIds: z.array(z.string().uuid()),
    countryCode: z.string(),
    timezone: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    streetLine: z.string().nullable(),
    locality: z.string().nullable(),
    adminArea: z.string().nullable(),
    postalCode: z.string().nullable(),
    phoneE164: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    websiteDestinationId: z.string().uuid().nullable(),
    price: placePriceSchema.nullable(),
    hours: z.array(placeHourSchema),
    media: z.array(placeMediaSchema),
    attributes: placeAttributeSchema,
    providerReferences: z.array(
      z
        .object({
          providerCode: z.string(),
          providerName: z.string(),
          externalId: z.string(),
          matchMethod: z.string(),
        })
        .strict(),
    ),
    audit: z.array(
      z
        .object({
          action: z.string(),
          occurredAt: z.string(),
        })
        .strict(),
    ),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export type PlaceDetail = z.infer<typeof placeDetailSchema>;

export const placeCategoryOptionSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    parentId: z.string().uuid().nullable(),
  })
  .strict();

export type PlaceCategoryOption = z.infer<typeof placeCategoryOptionSchema>;

