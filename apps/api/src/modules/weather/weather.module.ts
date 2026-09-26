import { Module } from "@nestjs/common";

/** No weather provider is called. Search does not import this module. */
@Module({})
export class WeatherModule {}
