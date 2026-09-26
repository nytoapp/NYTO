import type { ErrorCode } from "@atlas/contracts";

export class AppError extends Error {
  constructor(
    readonly errorCode: ErrorCode,
    message: string,
    readonly status: number,
    readonly retryable = false,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
