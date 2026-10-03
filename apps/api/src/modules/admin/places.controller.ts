import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ErrorCodes, placeListQuerySchema, placeWriteSchema, successEnvelope } from "@atlas/contracts";
import type { Request } from "express";
import { z, type ZodType } from "zod";
import { CurrentUser, RequireAuthGuard, Roles, RolesGuard } from "../../shared/http/auth.guard";
import { AppError } from "../../shared/http/app-error";
import { PlacesAdminService } from "./places.service";

const placeIdSchema = z.string().uuid();

export function parsePlaceId(id: string): string {
  const parsed = placeIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "That place id is not valid.", 422, false, { fields: ["id"] });
  }
  return parsed.data;
}

export function parsePlaceListQuery(query: Record<string, unknown>) {
  const parsed = placeListQuerySchema.safeParse({
    q: blank(query.q),
    status: blank(query.status),
    categoryId: blank(query.categoryId),
    countryCode: blank(query.countryCode),
    locality: blank(query.locality),
    includeArchived: query.includeArchived === true || query.includeArchived === "true",
    sort: blank(query.sort),
    direction: blank(query.direction),
    limit: query.limit === undefined || query.limit === "" ? undefined : Number(query.limit),
    offset: query.offset === undefined || query.offset === "" ? undefined : Number(query.offset),
  });
  if (!parsed.success) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Check the filters and try again.", 422, false, {
      fields: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
  }
  return parsed.data;
}

function blank(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Check the request and try again.", 422, false, {
      fields: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
  }
  return parsed.data;
}

function envelope<T>(request: Request, data: T) {
  return successEnvelope(data, { requestId: request.requestId, correlationId: request.correlationId });
}

@Controller("v1/admin")
@UseGuards(RequireAuthGuard, RolesGuard)
@Roles("admin")
export class PlacesAdminController {
  constructor(@Inject(PlacesAdminService) private readonly places: PlacesAdminService) {}

  @Get("places")
  async list(@Req() request: Request, @Query() query: Record<string, unknown>) {
    return envelope(request, await this.places.list(parsePlaceListQuery(query)));
  }

  @Get("place-categories")
  async categories(@Req() request: Request) {
    return envelope(request, { categories: await this.places.categories() });
  }

  @Get("place-countries")
  async countries(@Req() request: Request) {
    const [countries, currencies] = await Promise.all([this.places.countries(), this.places.currencies()]);
    return envelope(request, { countries, currencies });
  }

  @Get("place-tags")
  async tags(@Req() request: Request) {
    return envelope(request, { tags: await this.places.tags() });
  }

  @Get("place-providers")
  async providers(@Req() request: Request) {
    return envelope(request, { providers: await this.places.providers() });
  }

  @Get("places/:id")
  async get(@Req() request: Request, @Param("id") id: string) {
    return envelope(request, await this.places.get(parsePlaceId(id)));
  }

  @Post("places")
  async create(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Body() body: unknown) {
    const input = parseBody(placeWriteSchema, body);
    return envelope(request, await this.places.create(input, user.userId, request.requestId));
  }

  @Patch("places/:id")
  async update(
    @Req() request: Request,
    @CurrentUser() user: NonNullable<Request["user"]>,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = parseBody(placeWriteSchema, body);
    return envelope(request, await this.places.update(parsePlaceId(id), input, user.userId, request.requestId));
  }

  @Post("places/:id/archive")
  async archive(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Param("id") id: string) {
    return envelope(request, await this.places.archive(parsePlaceId(id), user.userId, request.requestId));
  }

  @Post("places/:id/restore")
  async restore(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Param("id") id: string) {
    return envelope(request, await this.places.restore(parsePlaceId(id), user.userId, request.requestId));
  }
}
