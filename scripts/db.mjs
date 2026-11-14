// Shared connection settings for the scripts. Mirrors src/lib/db.ts.
import mysql from "mysql2/promise";

export function connectionOptions() {
  const common = { charset: "utf8mb4", dateStrings: true };
  if (process.env.DATABASE_URL) return { uri: process.env.DATABASE_URL, ...common };
  return {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...common,
  };
}

export function connect(extra = {}) {
  return mysql.createConnection({ ...connectionOptions(), ...extra });
}
