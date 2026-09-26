import { describe, expect, it } from "vitest";
import { loadEnv, minorUnitExponent, toMinorUnits } from "./index";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://atlas:atlas@127.0.0.1:5432/atlas",
  AUTH_JWT_SECRET: "test-jwt-secret-with-32-characters",
  AUTH_REFRESH_PEPPER: "test-refresh-pepper",
  AUTH_DESTINATION_SECRET: "test-destination-secret-32-characters",
};

describe("loadEnv", () => {
  it("rejects production fixture data and dev OTP logging", () => {
    expect(() =>
      loadEnv({
        ...valid,
        NODE_ENV: "production",
        FIXTURE_PROVIDER_ENABLED: "true",
        AUTH_LOG_DEV_OTP: "true",
        CORS_ORIGINS: "https://admin.example",
      }),
    ).toThrow(/fixture provider/i);
  });

  it("rejects a short signing secret", () => {
    expect(() => loadEnv({ ...valid, AUTH_JWT_SECRET: "short" })).toThrow(/AUTH_JWT_SECRET/);
  });
});

describe("money", () => {
  it("converts major units with the currency exponent", () => {
    expect(toMinorUnits(3000, "INR")).toBe(300_000);
    expect(toMinorUnits(3000, "JPY")).toBe(3000);
    expect(minorUnitExponent("KRW")).toBe(0);
  });
});
