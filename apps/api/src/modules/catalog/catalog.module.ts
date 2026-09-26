import { Module } from "@nestjs/common";

/** Catalog reads go through SQL in search, home, and subject detail. This module must not import providers. */
@Module({})
export class CatalogModule {}
