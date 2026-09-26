import { ErrorCodes } from "@atlas/contracts";
import { AppError } from "../../shared/http/app-error";
import { validateDestinationUrl } from "../destinations/url-policy";

export function assertPublicHttps(raw: string, field: string): string {
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Use a public https URL.", 422, false, { fields: [field] });
  }
  const decision = validateDestinationUrl(raw, [host], ["https"]);
  if (!decision.ok) {
    throw new AppError(ErrorCodes.DESTINATION_REJECTED, "That URL is not allowed.", 422, false, { fields: [field] });
  }
  return decision.href;
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}
