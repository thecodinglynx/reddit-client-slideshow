import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "STORAGE_DATABASE_URL environment variable is not set. Please set it to your Neon Postgres connection string.",
  );
}

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql, schema });
