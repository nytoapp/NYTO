import { MiddlewareConsumer, Module, type NestModule, RequestMethod } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { limits, loadEnv, splitCsv, type ApiEnv } from "@atlas/config";
import Redis from "ioredis";
import { Database } from "./shared/db/database";
import { ApiExceptionFilter } from "./shared/http/exception.filter";
import { RequestContextMiddleware } from "./shared/http/request-context.middleware";
import { APP_FILTER } from "@nestjs/core";
import { OptionalAuthMiddleware } from "./modules/identity/optional-auth.middleware";
import { IdentityRepository } from "./modules/identity/identity.repository";
import { IdentityService } from "./modules/identity/identity.service";
import { AppleTokenVerifier, GoogleTokenVerifier } from "./modules/identity/verifiers";
import { FixtureAdapter } from "./modules/providers/adapters/fixture.adapter";
import { GooglePlacesAdapter } from "./modules/providers/adapters/google.adapter";
import { ProviderGateway, type ProviderAdapter } from "./modules/providers/gateway";
import { SearchService } from "./modules/search/search.service";
import { DestinationsService } from "./modules/destinations/destinations.service";
import { LibraryService } from "./modules/library/library.service";
import { TripsService } from "./modules/trips/trips.service";
import { HomeService } from "./modules/editorial/home.service";
import { GeoService } from "./modules/geo/geo.service";
import { AdminOverviewService } from "./modules/admin/overview.service";
import { PlacesAdminService } from "./modules/admin/places.service";
import { PlacesAdminController } from "./modules/admin/places.controller";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ConsentModule } from "./modules/consent/consent.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { WeatherModule } from "./modules/weather/weather.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { FlagsModule } from "./modules/flags/flags.module";
import { AuditModule } from "./modules/audit/audit.module";
import { PrivacyModule } from "./modules/privacy/privacy.module";
import {
  AdminController,
  AuthController,
  CollectionsController,
  DestinationsController,
  GeoController,
  HealthController,
  HomeController,
  RecentController,
  SavesController,
  SearchController,
  SubjectsController,
  TripsController,
} from "./modules/http/api.controllers";

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ ttl: limits.globalRateWindowSeconds * 1000, limit: limits.globalRateLimit }] }),
    CatalogModule,
    ConsentModule,
    RecommendationsModule,
    ReviewsModule,
    ModerationModule,
    WeatherModule,
    NotificationsModule,
    FlagsModule,
    AuditModule,
    PrivacyModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    GeoController,
    SearchController,
    HomeController,
    DestinationsController,
    SubjectsController,
    SavesController,
    CollectionsController,
    RecentController,
    TripsController,
    AdminController,
    PlacesAdminController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    {
      provide: Database,
      useFactory: () => new Database(loadEnv().DATABASE_URL),
    },
    {
      provide: Redis,
      useFactory: () =>
        new Redis(loadEnv().REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: 1_000,
        }),
    },
    {
      provide: IdentityRepository,
      useFactory: (database: Database) => new IdentityRepository(database.pool),
      inject: [Database],
    },
    {
      provide: IdentityService,
      useFactory: (repository: IdentityRepository) => {
        const env = loadEnv();
        return new IdentityService(
          repository,
          env,
          new GoogleTokenVerifier(splitCsv(env.GOOGLE_CLIENT_IDS)),
          new AppleTokenVerifier(splitCsv(env.APPLE_CLIENT_IDS)),
        );
      },
      inject: [IdentityRepository],
    },
    {
      provide: "ADAPTERS",
      useFactory: (): ProviderAdapter[] => {
        const env: ApiEnv = loadEnv();
        const adapters: ProviderAdapter[] = [];
        if (env.FIXTURE_PROVIDER_ENABLED) {
          adapters.push(new FixtureAdapter());
        }
        if (env.GOOGLE_PLACES_API_KEY) {
          adapters.push(new GooglePlacesAdapter(env.GOOGLE_PLACES_API_KEY));
        }
        return adapters;
      },
    },
    {
      provide: ProviderGateway,
      useFactory: (adapters: ProviderAdapter[]) => new ProviderGateway(adapters),
      inject: ["ADAPTERS"],
    },
    {
      provide: SearchService,
      useFactory: (database: Database, gateway: ProviderGateway) => new SearchService(database.pool, gateway, loadEnv().AUTH_DESTINATION_SECRET),
      inject: [Database, ProviderGateway],
    },
    {
      provide: DestinationsService,
      useFactory: (database: Database, adapters: ProviderAdapter[]) => new DestinationsService(database.pool, loadEnv().AUTH_DESTINATION_SECRET, adapters),
      inject: [Database, "ADAPTERS"],
    },
    { provide: LibraryService, useFactory: (database: Database) => new LibraryService(database.pool), inject: [Database] },
    { provide: TripsService, useFactory: (database: Database) => new TripsService(database.pool), inject: [Database] },
    { provide: HomeService, useFactory: (database: Database) => new HomeService(database.pool), inject: [Database] },
    { provide: GeoService, useFactory: (database: Database) => new GeoService(database.pool), inject: [Database] },
    { provide: AdminOverviewService, useFactory: (database: Database) => new AdminOverviewService(database), inject: [Database] },
    { provide: PlacesAdminService, useFactory: (database: Database) => new PlacesAdminService(database), inject: [Database] },
    OptionalAuthMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, OptionalAuthMiddleware).forRoutes({ path: "*path", method: RequestMethod.ALL });
  }
}
