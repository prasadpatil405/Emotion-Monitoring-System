import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  console.error("CRITICAL: DATABASE_URL is missing in environment variables!");
  throw new Error(
    "DATABASE_URL must be set. Connection is required for Postgres-based storage.",
  );
} else {
  console.log("DATABASE_URL is present, initializing connection...");
}

export const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
