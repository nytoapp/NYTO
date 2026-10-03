import { createParamDecorator, type ExecutionContext, Inject, Injectable, type CanActivate, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorCodes } from "@atlas/contracts";
import type { Request } from "express";
import { AppError } from "./app-error";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<Request>().user ?? null;
});

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new AppError(ErrorCodes.AUTHENTICATION_REQUIRED, "Sign in to continue.", 401);
    }
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new AppError(ErrorCodes.AUTHENTICATION_REQUIRED, "Sign in to continue.", 401);
    }
    if (!roles.some((role) => request.user?.roles.includes(role))) {
      throw new AppError(ErrorCodes.FORBIDDEN, "You cannot do that.", 403);
    }
    return true;
  }
}
