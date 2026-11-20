import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import mysql from "mysql2/promise";

// Runs once each time the server starts (see src/instrumentation.ts).
// GoDaddy Node.js Hosting gives no shell to run `npm run db:migrate`, so the app sets up its own tables.
// Everything here is safe to repeat: tables are created only if missing.

// Columns added after the first release. CREATE TABLE IF NOT EXISTS skips tables that already exist,
// so new columns are added here. Keep in step with scripts/migrate.mjs.
const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ["kitchens", "translations", "JSON NULL AFTER delivery_area"],
  ["kitchens", "owner_whatsapp", "VARCHAR(15) NULL AFTER domain"],
  ["kitchens", "upi_id", "VARCHAR(100) NULL AFTER owner_whatsapp"],
  ["kitchens", "uses_dabbas", "BOOLEAN NOT NULL DEFAULT TRUE AFTER upi_id"],
  ["orders", "allergy_alert", "BOOLEAN NULL AFTER status"],
  ["orders", "address", "VARCHAR(300) NULL AFTER area"],
  ["orders", "delivery", "VARCHAR(12) NOT NULL DEFAULT 'waiting' AFTER status"],
  ["orders", "track_code", "VARCHAR(24) NULL UNIQUE AFTER delivery"],
];

async function migrate() {
  const options = { charset: "utf8mb4", multipleStatements: true };
  const conn = process.env.DATABASE_URL
    ? await mysql.createConnection({ uri: process.env.DATABASE_URL, ...options })
    : await mysql.createConnection({
        host: process.env.DB_HOST ?? "127.0.0.1",
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ...options,
      });
  try {
    await conn.query(await readFile(path.join(process.cwd(), "schema.sql"), "utf8"));
    for (const [table, column, definition] of ADDED_COLUMNS) {
      const [found] = await conn.query<mysql.RowDataPacket[]>(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
        [table, column],
      );
      if (found.length === 0) await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
    console.log("Startup: database tables are ready.");
  } finally {
    await conn.end();
  }
}

export async function runStartup() {
  try {
    await migrate();
  } catch (error) {
    // The site still starts, so the logs can be read; pages that need the database will show errors.
    console.error("Startup: could not set up the database. Check the DB_* settings.", error);
    return;
  }

  // Set SEED_DEMO_ON_START=1 in the hosting settings to load the Lakshmi Tiffins demo on the next restart.
  // It resets the demo kitchen each time, so remove the setting once the demo data is in place.
  if (process.env.SEED_DEMO_ON_START === "1") {
    try {
      const { stdout } = await promisify(execFile)(process.execPath, [path.join(process.cwd(), "scripts", "seed-demo.mjs")], { env: process.env });
      console.log(`Startup: demo data loaded.\n${stdout}`);
    } catch (error) {
      console.error("Startup: could not load the demo data.", error);
    }
  }
}
