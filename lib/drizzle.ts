import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const sql = postgres(process.env.DATABASE_URL ?? "", {
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

export const db = drizzle(sql);
