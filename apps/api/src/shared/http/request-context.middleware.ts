import { Injectable, type NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logInfo } from "../observability/logger";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incoming = request.header("x-request-id");
    request.requestId = incoming && /^[A-Za-z0-9-]{8,80}$/.test(incoming) ? incoming : randomUUID();
    request.correlationId = request.header("x-correlation-id") || request.requestId;
    response.setHeader("x-request-id", request.requestId);
    const started = Date.now();
    response.on("finish", () => {
      logInfo("request", {
        requestId: request.requestId,
        correlationId: request.correlationId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Date.now() - started,
      });
    });
    next();
  }
}
