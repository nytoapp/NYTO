export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  AMBIGUOUS_LOCATION: "AMBIGUOUS_LOCATION",
  DESTINATION_REJECTED: "DESTINATION_REJECTED",
  DESTINATION_EXPIRED: "DESTINATION_EXPIRED",
  AUTH_PROVIDER_NOT_CONFIGURED: "AUTH_PROVIDER_NOT_CONFIGURED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type ApiErrorBody = {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
  details?: unknown;
};

export type ApiMeta = {
  requestId: string;
  correlationId: string;
  nextCursor: string | null;
  warnings: ApiWarning[];
};

export type ApiWarning = {
  code: string;
  provider?: string;
  message: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
  error: null;
};

export type ApiFailure = {
  data: null;
  meta: ApiMeta;
  error: ApiErrorBody;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function successEnvelope<T>(data: T, meta: Omit<ApiMeta, "warnings" | "nextCursor"> & Partial<ApiMeta>): ApiSuccess<T> {
  return {
    data,
    error: null,
    meta: {
      warnings: [],
      nextCursor: null,
      ...meta,
    },
  };
}
