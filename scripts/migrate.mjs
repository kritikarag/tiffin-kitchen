// Creates the tables. Run with: npm run db:migrate
import { readFile } from "node:fs/promises";
import { connect } from "./db.mjs";

const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
const db = await connect({ multipleStatements: true });
await db.query(sql);
const [tables] = await db.query("SHOW TABLES");
console.log(`Schema applied. Tables: ${tables.map((t) => Object.values(t)[0]).join(", ")}`);
await db.end();
