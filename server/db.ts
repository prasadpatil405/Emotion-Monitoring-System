import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Connection is required for Postgres-based storage.",
  );
}

export const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
