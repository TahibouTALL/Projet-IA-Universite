import { defineConfig } from "drizzle-kit";

// Charge le fichier .env s'il existe (les variables déjà définies dans le terminal restent prioritaires)
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
