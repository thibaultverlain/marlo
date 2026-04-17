import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string - configured via DATABASE_URL in .env.local
// Use the Supabase "Transaction" pooler URL (port 6543) for serverless
const connectionString = process.env.DATABASE_URL;

// Lazy singleton - only creates connection when needed, avoids build-time crashes
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure your Supabase connection."
    );
  }

  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
