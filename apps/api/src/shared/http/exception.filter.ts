import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { ErrorCodes, type ApiFailure } from "@atlas/contracts";
import type { Request, Response } from "express";
import { AppError } from "./app-error";
import { logError } from "../observability/logger";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = request.requestId ?? "unknown";
    const mapped = mapException(exception);
    if (mapped.status >= 500) {
      logError("request failed", {
        requestId,
        errorCode: mapped.errorCode,
        name: exception instanceof Error ? exception.name : "Error",
      });
    }
    const body: ApiFailure = {
      data: null,
      error: {
        code: mapped.errorCode,
        message: mapped.message,
        retryable: mapped.retryable,
        requestId,
        ...(mapped.details === undefined ? {} : { details: mapped.details }),
      },
      meta: {
        requestId,
        correlationId: request.correlationId ?? requestId,
        nextCursor: null,
        warnings: [],
      },
    };
    response.status(mapped.status).json(body);
  }
}

function mapException(exception: unknown): {
  status: number;
  errorCode: ApiFailure["error"]["code"];
  message: string;
  retryable: boolean;
  details?: unknown;
} {
  if (exception instanceof AppError) {
    return {
      status: exception.status,
      errorCode: exception.errorCode,
      message: exception.message,
      retryable: exception.retryable,
      details: exception.details,
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      errorCode: status === 429 ? ErrorCodes.RATE_LIMITED : ErrorCodes.VALIDATION_ERROR,
      message: status === 429 ? "Too many requests. Wait a moment and try again." : "Check the request and try again.",
      retryable: status === 429,
    };
  }
  return {
    status: 500,
    errorCode: ErrorCodes.INTERNAL,
    message: "The request could not be completed.",
    retryable: true,
  };
}
