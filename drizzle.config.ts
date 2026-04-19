import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "STORAGE_DATABASE_URL environment variable is not set. Please set it to your Neon Postgres connection string.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
