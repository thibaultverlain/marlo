import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local");
}

// Disable prefetch as it's not supported for Transaction pool mode on Supabase
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export type DB = typeof db;
