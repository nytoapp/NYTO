import { Injectable, type NestMiddleware } from "@nestjs/common";
import { loadEnv } from "@atlas/config";
import type { NextFunction, Request, Response } from "express";
import { readAccessToken } from "./crypto";
import { IdentityRepository } from "./identity.repository";

@Injectable()
export class OptionalAuthMiddleware implements NestMiddleware {
  constructor(private readonly repository: IdentityRepository) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const header = request.header("authorization");
    if (!header?.toLowerCase().startsWith("bearer ")) {
      next();
      return;
    }
    const token = header.slice(7).trim();
    const claims = await readAccessToken(loadEnv().AUTH_JWT_SECRET, token);
    if (!claims) {
      next();
      return;
    }
    request.user = (await this.repository.principalForSession(claims.sessionId, claims.userId)) ?? undefined;
    next();
  }
}
