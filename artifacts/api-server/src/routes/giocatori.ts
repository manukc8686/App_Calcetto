import { Router, type IRouter } from "express";
import { eq, sql, inArray, desc, asc, ilike } from "drizzle-orm";
import { db, giocatori } from "../lib/db";
import {
  CreateGiocatoreBody,
  UpdateGiocatoreBody,
  BulkDeleteGiocatoriBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/giocatori", async (_req, res) => {
  const rows = await db
    .select()
    .from(giocatori)
    .orderBy(desc(giocatori.rating), asc(giocatori.nome));
  res.json(rows);
});

router.post("/giocatori", async (req, res) => {
  const parsed = CreateGiocatoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { nome, ruolo, rating } = parsed.data;

  const [dup] = await db
    .select({ id: giocatori.id })
    .from(giocatori)
    .where(ilike(giocatori.nome, nome))
    .limit(1);
  if (dup) {
    res.status(409).json({ error: "Giocatore già presente" });
    return;
  }

  const [newPlayer] = await db
    .insert(giocatori)
    .values({ nome, ruolo, rating, presenze: 0, vittorie: 0 })
    .returning();
  res.status(201).json(newPlayer);
});

router.post("/giocatori/bulk-delete", async (req, res) => {
  const parsed = BulkDeleteGiocatoriBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { ids } = parsed.data;
  if (ids.length === 0) {
    res.json({ deleted: 0 });
    return;
  }
  const deleted = await db
    .delete(giocatori)
    .where(inArray(giocatori.id, ids))
    .returning({ id: giocatori.id });
  res.json({ deleted: deleted.length });
});

router.get("/giocatori/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [giocatore] = await db.select().from(giocatori).where(eq(giocatori.id, id)).limit(1);
  if (!giocatore) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.json(giocatore);
});

router.delete("/giocatori/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const deleted = await db.delete(giocatori).where(eq(giocatori.id, id)).returning({ id: giocatori.id });
  if (deleted.length === 0) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.status(204).send();
});

router.patch("/giocatori/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateGiocatoreBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { nome, ruolo, rating } = parsed.data;

  const patch: Partial<typeof giocatori.$inferInsert> = {};
  if (nome !== undefined) patch.nome = nome;
  if (ruolo !== undefined) patch.ruolo = ruolo;
  if (rating !== undefined) patch.rating = rating;

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(giocatori).where(eq(giocatori.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
    res.json(existing);
    return;
  }

  const [updated] = await db.update(giocatori).set(patch).where(eq(giocatori.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.json(updated);
});

router.post("/giocatori/:id/presenze", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db
    .update(giocatori)
    .set({ presenze: sql`${giocatori.presenze} + 1` })
    .where(eq(giocatori.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.json(updated);
});

router.delete("/giocatori/:id/presenze", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db
    .update(giocatori)
    .set({ presenze: sql`GREATEST(0, ${giocatori.presenze} - 1)` })
    .where(eq(giocatori.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.json(updated);
});

router.post("/giocatori/:id/vittorie", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db
    .update(giocatori)
    .set({ vittorie: sql`${giocatori.vittorie} + 1` })
    .where(eq(giocatori.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.json(updated);
});

router.delete("/giocatori/:id/vittorie", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db
    .update(giocatori)
    .set({ vittorie: sql`GREATEST(0, ${giocatori.vittorie} - 1)` })
    .where(eq(giocatori.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.json(updated);
});

router.post("/giocatori/:id/reset-stats", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db
    .update(giocatori)
    .set({ presenze: 0, vittorie: 0 })
    .where(eq(giocatori.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Giocatore non trovato" }); return; }
  res.json(updated);
});

router.get("/stats", async (_req, res) => {
  const [totaleRow] = await db
    .select({
      totaleGiocatori: sql<number>`count(*)::int`,
      totalePresenze: sql<number>`coalesce(sum(${giocatori.presenze}), 0)::int`,
      totaleVittorie: sql<number>`coalesce(sum(${giocatori.vittorie}), 0)::int`,
    })
    .from(giocatori);

  const [miglioreAttacco] = await db
    .select({ nome: giocatori.nome })
    .from(giocatori)
    .where(eq(giocatori.ruolo, "Attaccante"))
    .orderBy(desc(giocatori.rating), desc(giocatori.vittorie))
    .limit(1);

  const [migliorePortiere] = await db
    .select({ nome: giocatori.nome })
    .from(giocatori)
    .where(eq(giocatori.ruolo, "Portiere"))
    .orderBy(desc(giocatori.rating), desc(giocatori.presenze))
    .limit(1);

  res.json({
    totaleGiocatori: totaleRow?.totaleGiocatori ?? 0,
    totalePresenze: totaleRow?.totalePresenze ?? 0,
    totaleVittorie: totaleRow?.totaleVittorie ?? 0,
    miglioreAttacco: miglioreAttacco?.nome ?? null,
    migliorePortiere: migliorePortiere?.nome ?? null,
  });
});

export default router;
