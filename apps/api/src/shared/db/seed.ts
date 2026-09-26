import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "@atlas/config";
import { Database } from "./database";

async function main(): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === "production") {
    throw new Error("Fixture seed is refused in production.");
  }
  const database = new Database(env.DATABASE_URL);
  try {
    const sql = await readFile(path.join(__dirname, "..", "..", "..", "seeds", "002_fixture.sql"), "utf8");
    await database.pool.query(sql);
    console.log(JSON.stringify({ seeded: "fixture" }));
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exit(1);
  });
}
