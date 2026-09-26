import { Module } from "@nestjs/common";

/** Flags live in the database. The API reads environment gates for fixture and OTP in this phase. */
@Module({})
export class FlagsModule {}
