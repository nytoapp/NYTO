import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import Redis from "ioredis";
import type { Request } from "express";
import {
  destinationResolveRequestSchema,
  emailLoginRequestSchema,
  emailRegisterRequestSchema,
  emailVerifyRequestSchema,
  ErrorCodes,
  oauthRequestSchema,
  phoneStartRequestSchema,
  phoneVerifyRequestSchema,
  refreshRequestSchema,
  saveRequestSchema,
  searchRequestSchema,
  successEnvelope,
  tripCreateRequestSchema,
  tripItemRequestSchema,
} from "@atlas/contracts";
import type { ZodType } from "zod";
import { Database } from "../../shared/db/database";
import { CurrentUser, RequireAuthGuard, Roles, RolesGuard } from "../../shared/http/auth.guard";
import { AppError } from "../../shared/http/app-error";
import { IdentityService } from "../identity/identity.service";
import { GeoService } from "../geo/geo.service";
import { SearchService } from "../search/search.service";
import { DestinationsService } from "../destinations/destinations.service";
import { LibraryService } from "../library/library.service";
import { TripsService } from "../trips/trips.service";
import { HomeService } from "../editorial/home.service";
import { loadSubjectDetail } from "../catalog/facts";
import { AdminOverviewService } from "../admin/overview.service";

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

@SkipThrottle()
@Controller("v1")
export class HealthController {
  constructor(
    private readonly database: Database,
    private readonly redis: Redis,
  ) {}

  @Get("health")
  live(@Req() request: Request) {
    return envelope(request, { status: "live" });
  }

  @Get("health/ready")
  async ready(@Req() request: Request) {
    const postgres = await this.database.ping().then(() => true).catch(() => false);
    const redis = await pingRedis(this.redis);
    if (!postgres || !redis) {
      throw new AppError(ErrorCodes.SERVICE_UNAVAILABLE, "Dependencies are not ready.", 503, true, { postgres, redis });
    }
    return envelope(request, { status: "ready", postgres, redis });
  }
}

async function pingRedis(redis: Redis): Promise<boolean> {
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly identity: IdentityService) {}

  @Post("phone/start")
  async startPhone(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(phoneStartRequestSchema, body);
    return envelope(request, await this.identity.startPhone(input.phoneE164, request.requestId));
  }

  @Post("phone/verify")
  async verifyPhone(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(phoneVerifyRequestSchema, body);
    return envelope(request, await this.identity.verifyPhone(input.phoneE164, input.code, input.device, request.requestId));
  }

  @Post("email/register")
  async register(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(emailRegisterRequestSchema, body);
    return envelope(request, await this.identity.registerEmail(input.email, input.password, request.requestId));
  }

  @Post("email/verify")
  async verifyEmail(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(emailVerifyRequestSchema, body);
    return envelope(request, await this.identity.verifyEmail(input.email, input.code, input.device, request.requestId));
  }

  @Post("email/login")
  async login(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(emailLoginRequestSchema, body);
    return envelope(request, await this.identity.loginEmail(input.email, input.password, input.device, request.requestId));
  }

  @Post("google")
  async google(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(oauthRequestSchema, body);
    return envelope(request, await this.identity.signInGoogle(input.idToken, input.nonce, input.device, request.requestId));
  }

  @Post("apple")
  async apple(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(oauthRequestSchema, body);
    return envelope(request, await this.identity.signInApple(input.idToken, input.nonce, input.device, request.requestId));
  }

  @Post("refresh")
  async refresh(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(refreshRequestSchema, body);
    return envelope(request, await this.identity.refresh(input.refreshToken));
  }

  @Post("logout")
  @UseGuards(RequireAuthGuard)
  async logout(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>) {
    return envelope(request, await this.identity.logout(user.sessionId, request.requestId, user.userId));
  }

  @Post("link/google")
  @UseGuards(RequireAuthGuard)
  async linkGoogle(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Body() body: unknown) {
    const input = parseBody(oauthRequestSchema, body);
    return envelope(request, await this.identity.linkGoogle(user.userId, input.idToken, input.nonce, request.requestId));
  }
}

@Controller("v1/geo")
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get("suggest")
  async suggest(@Req() request: Request, @Query("q") q = "", @Query("country") country?: string) {
    return envelope(request, { candidates: await this.geo.suggest(q.slice(0, 80), country ?? null) });
  }

  @Post("resolve")
  async resolve(@Req() request: Request, @Body() body: unknown) {
    const parsed = body as { query?: unknown; countryCode?: unknown };
    if (typeof parsed.query !== "string" || parsed.query.trim().length === 0 || parsed.query.length > 80) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Enter a city name.", 422);
    }
    const countryCode = typeof parsed.countryCode === "string" ? parsed.countryCode : null;
    return envelope(request, await this.geo.resolve(parsed.query.trim(), countryCode));
  }
}

@Controller("v1/search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post()
  async run(@Req() request: Request, @Body() body: unknown, @CurrentUser() user: Request["user"]) {
    const input = parseBody(searchRequestSchema, body);
    const data = await this.search.search(input, user?.userId ?? null, request.requestId);
    const response = envelope(request, data);
    if (data.notices.length > 0) {
      response.meta.warnings = data.notices.map((notice) => ({ code: notice.code, message: notice.message }));
    }
    return response;
  }
}

@Controller("v1/home")
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  async load(@Req() request: Request, @Query("selectedLocationId") selectedLocationId?: string, @Query("locale") locale = "en") {
    return envelope(request, await this.home.load(selectedLocationId ?? null, locale));
  }
}

@Controller("v1/destinations")
export class DestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Post("resolve")
  async resolve(@Req() request: Request, @Body() body: unknown) {
    const input = parseBody(destinationResolveRequestSchema, body);
    return envelope(request, await this.destinations.resolve(input.destinationId));
  }
}

@Controller("v1/subjects")
export class SubjectsController {
  constructor(private readonly database: Database) {}

  @Get(":id")
  async get(@Req() request: Request, @Param("id") id: string, @Query("locale") locale = "en") {
    const detail = await loadSubjectDetail(this.database.pool, id, locale);
    if (!detail) {
      throw new AppError(ErrorCodes.NOT_FOUND, "That item is no longer available.", 404);
    }
    return envelope(request, detail);
  }
}

@Controller("v1/saves")
@UseGuards(RequireAuthGuard)
export class SavesController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  async list(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>) {
    return envelope(request, { items: await this.library.listSaves(user.userId) });
  }

  @Post()
  async create(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Body() body: unknown) {
    const input = parseBody(saveRequestSchema, body);
    return envelope(request, await this.library.save(user.userId, input.subjectId, input.occurrenceId ?? null));
  }
}

@Controller("v1/collections")
@UseGuards(RequireAuthGuard)
export class CollectionsController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  async list(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>) {
    return envelope(request, { items: await this.library.listCollections(user.userId) });
  }

  @Post()
  async create(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Body() body: unknown) {
    const title = (body as { title?: string } | null)?.title;
    if (!title || title.length > 120) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Add a collection title.", 422);
    }
    return envelope(request, await this.library.createCollection(user.userId, title));
  }
}

@Controller("v1/recent")
@UseGuards(RequireAuthGuard)
export class RecentController {
  constructor(private readonly library: LibraryService) {}

  @Post()
  async create(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Body() body: unknown) {
    const subjectId = (body as { subjectId?: string } | null)?.subjectId;
    if (!subjectId) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Choose an item.", 422);
    }
    await this.library.recordView(user.userId, subjectId);
    return envelope(request, { recorded: true });
  }
}

@Controller("v1/trips")
@UseGuards(RequireAuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  async list(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>) {
    return envelope(request, { items: await this.trips.list(user.userId) });
  }

  @Get(":id")
  async get(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Param("id") id: string) {
    return envelope(request, await this.trips.get(user.userId, id));
  }

  @Post()
  async create(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Body() body: unknown) {
    const input = parseBody(tripCreateRequestSchema, body);
    return envelope(request, await this.trips.create(user.userId, input));
  }

  @Post(":id/items")
  async addItem(@Req() request: Request, @CurrentUser() user: NonNullable<Request["user"]>, @Param("id") id: string, @Body() body: unknown) {
    const input = parseBody(tripItemRequestSchema, body);
    return envelope(request, await this.trips.addItem(user.userId, id, input));
  }
}

@Controller("v1/admin")
@UseGuards(RequireAuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly overviewService: AdminOverviewService) {}

  @Get("status")
  status(@Req() request: Request) {
    return envelope(request, { status: "ok" });
  }

  @Get("overview")
  async overview(@Req() request: Request) {
    return envelope(request, await this.overviewService.load());
  }
}
