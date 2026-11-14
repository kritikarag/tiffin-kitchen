import mysql, { type Pool } from "mysql2/promise";

// One pool for the whole process. Kept on globalThis so dev reloads don't open a new pool each time.
const globalForDb = globalThis as unknown as { tiffinPool?: Pool };

function createPool(): Pool {
  // dateStrings keeps DATE and TIME columns as plain strings, so no time zone conversion happens.
  const common = { charset: "utf8mb4", dateStrings: true, connectionLimit: 5 };
  if (process.env.DATABASE_URL) {
    return mysql.createPool({ uri: process.env.DATABASE_URL, ...common });
  }
  return mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...common,
  });
}

export function db(): Pool {
  return (globalForDb.tiffinPool ??= createPool());
}

// MySQL returns JSON columns parsed; MariaDB returns them as text. Accept both.
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
