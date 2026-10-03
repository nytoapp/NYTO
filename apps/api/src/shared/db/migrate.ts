import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "@atlas/config";
import { Database } from "./database";

export async function applySqlFiles(database: Database, directory: string): Promise<string[]> {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const name of names) {
    const registered = await database.pool.query("select to_regclass('public.schema_migrations') as rel");
    if (registered.rows[0]?.rel) {
      const existing = await database.pool.query("select 1 from schema_migrations where id = $1", [name]);
      if (existing.rowCount) {
        continue;
      }
    }
    const sql = await readFile(path.join(directory, name), "utf8");
    const client = await database.pool.connect();
    try {
      await client.query("begin");
      // 001_foundation.sql creates schema_migrations. An empty table left by an
      // earlier runner attempt would make that statement fail.
      const pending = await client.query("select to_regclass('public.schema_migrations') as rel");
      if (pending.rows[0]?.rel && sql.includes("CREATE TABLE schema_migrations")) {
        const count = await client.query("select count(*)::int as n from schema_migrations");
        if (count.rows[0]?.n === 0) {
          await client.query("drop table schema_migrations");
        }
      }
      await client.query(sql);
      await client.query("insert into schema_migrations (id) values ($1)", [name]);
      await client.query("commit");
      applied.push(name);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  return applied;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const database = new Database(env.DATABASE_URL);
  try {
    const applied = await applySqlFiles(database, path.join(__dirname, "..", "..", "..", "migrations"));
    console.log(JSON.stringify({ applied }));
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Migration failed");
    process.exit(1);
  });
}
