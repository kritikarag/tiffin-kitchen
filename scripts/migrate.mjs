// Creates the tables. Run with: npm run db:migrate
import { readFile } from "node:fs/promises";
import { connect } from "./db.mjs";

const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
const db = await connect({ multipleStatements: true });
await db.query(sql);
// Columns added after the first release. CREATE TABLE IF NOT EXISTS skips existing tables, so add them here.
const added = [
  ["kitchens", "translations", "JSON NULL AFTER delivery_area"],
  ["kitchens", "owner_whatsapp", "VARCHAR(15) NULL AFTER domain"],
  ["kitchens", "upi_id", "VARCHAR(100) NULL AFTER owner_whatsapp"],
  ["kitchens", "uses_dabbas", "BOOLEAN NOT NULL DEFAULT TRUE AFTER upi_id"],
  ["orders", "allergy_alert", "BOOLEAN NULL AFTER status"],
  ["orders", "address", "VARCHAR(300) NULL AFTER area"],
  ["orders", "delivery", "VARCHAR(12) NOT NULL DEFAULT 'waiting' AFTER status"],
  ["orders", "track_code", "VARCHAR(24) NULL UNIQUE AFTER delivery"],
  ["orders", "delivered_by", "VARCHAR(10) NULL AFTER track_code"],
];
for (const [table, column, definition] of added) {
  const [found] = await db.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
    [table, column],
  );
  if (found.length === 0) {
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Added ${table}.${column}`);
  }
}
const [tables] = await db.query("SHOW TABLES");
console.log(`Schema applied. Tables: ${tables.map((t) => Object.values(t)[0]).join(", ")}`);
await db.end();
