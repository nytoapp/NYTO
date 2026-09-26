import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { loadEnv, splitCsv } from "@atlas/config";
import helmet from "helmet";
import express from "express";
import { limits } from "@atlas/config";
import { AppModule } from "./app.module";
import { logInfo } from "./shared/observability/logger";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(helmet());
  app.use(express.json({ limit: limits.bodyLimitBytes }));
  app.setGlobalPrefix("api");
  app.enableCors({ origin: splitCsv(env.CORS_ORIGINS), credentials: false });
  await app.listen(env.PORT);
  logInfo("api listening", { port: env.PORT });
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "API failed to start");
  process.exit(1);
});
