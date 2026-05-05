import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local");
}

// Optimized for Vercel serverless + Supabase Supavisor pooler
const client = postgres(connectionString, {
  prepare: false,
  idle_timeout: 20,
  max: 1,
  connect_timeout: 10,
  max_lifetime: 60 * 5,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
