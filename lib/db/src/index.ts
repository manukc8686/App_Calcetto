import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";
import { giocatori } from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";

/**
 * Creates tables if they don't exist yet and seeds demo data on first boot.
 *
 * This app's schema is tiny and changes rarely, so we manage it with a
 * plain idempotent `CREATE TABLE IF NOT EXISTS` here instead of running
 * `drizzle-kit` migrations at deploy time. For a larger/evolving schema,
 * switch to `drizzle-kit generate` + `drizzle-orm/node-postgres/migrator`.
 */
export async function ensureDatabaseReady(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS giocatori (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      ruolo TEXT NOT NULL CHECK (ruolo IN ('Attaccante', 'Difensore', 'Centrocampista', 'Portiere')),
      rating INTEGER NOT NULL DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
      presenze INTEGER NOT NULL DEFAULT 0,
      vittorie INTEGER NOT NULL DEFAULT 0
    )
  `);

  const existing = await db.select({ id: giocatori.id }).from(giocatori).limit(1);
  if (existing.length === 0) {
    await db.insert(giocatori).values([
      { nome: "Marco Rossi", ruolo: "Attaccante", rating: 5, presenze: 12, vittorie: 8 },
      { nome: "Luca Bianchi", ruolo: "Centrocampista", rating: 4, presenze: 15, vittorie: 9 },
      { nome: "Giovanni Ferrari", ruolo: "Difensore", rating: 3, presenze: 10, vittorie: 5 },
      { nome: "Antonio Russo", ruolo: "Portiere", rating: 4, presenze: 14, vittorie: 7 },
      { nome: "Davide Esposito", ruolo: "Attaccante", rating: 3, presenze: 8, vittorie: 3 },
    ]);
  }
}
