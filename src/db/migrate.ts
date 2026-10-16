// Applique les migrations SQL du dossier ./drizzle (utilisé en dev et au démarrage du conteneur)
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Charge le fichier .env s'il existe (les variables déjà définies dans le terminal restent prioritaires)
try {
  process.loadEnvFile();
} catch {}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrations appliquées.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
