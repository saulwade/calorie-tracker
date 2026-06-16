import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// Carga .env.local para que drizzle-kit vea TURSO_DATABASE_URL al hacer push.
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  },
} satisfies Config;
