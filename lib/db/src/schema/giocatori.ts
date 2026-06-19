import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const RUOLI = [
  "Attaccante",
  "Difensore",
  "Centrocampista",
  "Portiere",
] as const;

export const giocatori = pgTable("giocatori", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  ruolo: text("ruolo", { enum: RUOLI }).notNull(),
  rating: integer("rating").notNull().default(3),
  presenze: integer("presenze").notNull().default(0),
  vittorie: integer("vittorie").notNull().default(0),
});

export const insertGiocatoreSchema = createInsertSchema(giocatori).omit({
  id: true,
  presenze: true,
  vittorie: true,
});

export type InsertGiocatore = z.infer<typeof insertGiocatoreSchema>;
export type Giocatore = typeof giocatori.$inferSelect;
