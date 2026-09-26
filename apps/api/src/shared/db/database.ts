import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export class Database {
  readonly pool: Pool;
  readonly orm: NodePgDatabase;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 1_500,
      idleTimeoutMillis: 10_000,
    });
    this.orm = drizzle(this.pool);
  }

  async ping(): Promise<void> {
    await this.pool.query("select 1");
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
