import { z } from "zod";

export const limits = {
  queryMaxLength: 300,
  searchResultLimit: 30,
  mapPinLimit: 50,
  maxProvidersPerSearch: 5,
  providerTimeoutMs: 800,
  searchDeadlineMs: 1200,
  providerMaxConcurrency: 4,
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 30 * 24 * 60 * 60,
  otpTtlSeconds: 5 * 60,
  otpMaxAttempts: 5,
  otpMaxSendsPerHour: 5,
  recentViewCap: 50,
  dedupeDistanceMeters: 75,
  defaultRadiusMeters: 5_000,
  maxRadiusMeters: 50_000,
  destinationHandleTtlSeconds: 15 * 60,
  bodyLimitBytes: 32 * 1024,
  circuitFailureThreshold: 5,
  circuitOpenMs: 30_000,
  deletionGraceDays: 14,
  authRateLimit: 10,
  authRateWindowSeconds: 60,
  globalRateLimit: 120,
  globalRateWindowSeconds: 60,
} as const;

export { minorUnitExponent, toMinorUnits } from "./money.js";

const boolString = z.enum(["true", "false"]).transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
    AUTH_JWT_SECRET: z.string().min(32),
    AUTH_REFRESH_PEPPER: z.string().min(16),
    AUTH_DESTINATION_SECRET: z.string().min(32),
    AUTH_LOG_DEV_OTP: boolString.default(false),
    FIXTURE_PROVIDER_ENABLED: boolString.default(false),
    CORS_ORIGINS: z.string().default(""),
    GOOGLE_CLIENT_IDS: z.string().default(""),
    GOOGLE_PLACES_API_KEY: z.string().default(""),
    APPLE_CLIENT_IDS: z.string().default(""),
    PHONE_COUNTRY_ALLOWLIST: z.string().default(""),
    SENTRY_DSN: z.string().default(""),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") {
      return;
    }
    if (value.AUTH_LOG_DEV_OTP) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_LOG_DEV_OTP"],
        message: "Dev OTP logging is refused in production.",
      });
    }
    if (value.FIXTURE_PROVIDER_ENABLED) {
      context.addIssue({
        code: "custom",
        path: ["FIXTURE_PROVIDER_ENABLED"],
        message: "The fixture provider is refused in production.",
      });
    }
    if (value.CORS_ORIGINS.trim().length === 0) {
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message: "Production requires an explicit CORS origin list.",
      });
    }
  });

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return parsed.data;
}

export function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
