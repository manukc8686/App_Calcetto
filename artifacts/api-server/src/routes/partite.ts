import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, giocatori } from "../lib/db";
import { GeneraSquadreBody } from "@workspace/api-zod";

const router: IRouter = Router();

type GiocatoreConLivello = {
  id: number;
  nome: string;
  ruolo: string;
  rating: number;
  presenze: number;
  vittorie: number;
  livello: number;
  virtuale?: boolean;
};

// Livello = (rating * 2.0) + ((vittorie / (presenze + 1)) * 5.0)
function calcolaLivello(rating: number, vittorie: number, presenze: number): number {
  return Math.round(((rating * 2.0) + ((vittorie / (presenze + 1)) * 5.0)) * 10) / 10;
}

function livelleTotale(sq: GiocatoreConLivello[]): number {
  return Math.round(sq.reduce((acc, g) => acc + g.livello, 0) * 10) / 10;
}

// Serpentine (snake) draft for N teams
function serpentineDraft(players: GiocatoreConLivello[], teams: GiocatoreConLivello[][], maxSizes: number[]) {
  const n = teams.length;
  let idx = 0;
  let forward = true;

  for (const p of players) {
    // Skip teams that are already full
    let attempts = 0;
    while (teams[idx].length >= maxSizes[idx] && attempts < n) {
      if (forward) {
        idx = idx < n - 1 ? idx + 1 : idx;
      } else {
        idx = idx > 0 ? idx - 1 : idx;
      }
      attempts++;
    }

    teams[idx].push(p);

    if (forward) {
      if (idx === n - 1) { forward = false; }
      else { idx++; }
    } else {
      if (idx === 0) { forward = true; idx++; }
      else { idx--; }
    }
  }
}

router.post("/genera-squadre", async (req, res) => {
  const parsed = GeneraSquadreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { giocatoriIds, secondaPartitaIds = [] } = parsed.data;

  if (giocatoriIds.length < 3) {
    res.status(400).json({ error: "Servono almeno 3 giocatori per generare le squadre." });
    return;
  }

  const giocatoriRows = await db
    .select()
    .from(giocatori)
    .where(inArray(giocatori.id, giocatoriIds));

  if (giocatoriRows.length < 3) {
    res.status(400).json({ error: "Alcuni giocatori selezionati non esistono." });
    return;
  }

  const arricchiti: GiocatoreConLivello[] = giocatoriRows.map((g) => ({
    id: g.id,
    nome: g.nome,
    ruolo: g.ruolo,
    rating: g.rating,
    presenze: g.presenze,
    vittorie: g.vittorie,
    livello: calcolaLivello(g.rating, g.vittorie, g.presenze),
  }));

  const total = arricchiti.length;
  const base = Math.floor(total / 3);
  const remainder = total % 3;
  // Sizes: teams with extra player get base+1
  // Squadra 1=A, 2=B, 3=C
  const sizes = [
    base + (remainder > 0 ? 1 : 0),
    base + (remainder > 1 ? 1 : 0),
    base,
  ];

  const squadra1: GiocatoreConLivello[] = [];
  const squadra2: GiocatoreConLivello[] = [];
  const squadra3: GiocatoreConLivello[] = [];

  // Portieri
  const portieri = arricchiti.filter((g) => g.ruolo === "Portiere").sort((a, b) => b.livello - a.livello);
  const secondaPartitaSet = new Set(secondaPartitaIds);
  const movimentoAll = arricchiti.filter((g) => g.ruolo !== "Portiere").sort((a, b) => b.livello - a.livello);

  // Assign goalkeepers
  if (portieri.length >= 3) {
    squadra1.push(portieri[0]);
    squadra2.push(portieri[1]);
    squadra3.push(portieri[2]);
    portieri.slice(3).forEach((p) => movimentoAll.push(p));
    movimentoAll.sort((a, b) => b.livello - a.livello);
  } else if (portieri.length === 2) {
    squadra1.push(portieri[0]);
    squadra2.push(portieri[1]);
    squadra3.push({ id: -1, nome: "Portiere Virtuale", ruolo: "Virtuale", rating: 3, presenze: 0, vittorie: 0, livello: 6.0, virtuale: true });
  } else if (portieri.length === 1) {
    squadra1.push(portieri[0]);
    squadra2.push({ id: -2, nome: "Portiere Virtuale", ruolo: "Virtuale", rating: 3, presenze: 0, vittorie: 0, livello: 6.0, virtuale: true });
    squadra3.push({ id: -3, nome: "Portiere Virtuale", ruolo: "Virtuale", rating: 3, presenze: 0, vittorie: 0, livello: 6.0, virtuale: true });
  }

  // Seconda partita players → Squadra 3 (up to its target size, minus already assigned goalkeeper)
  const secondaPartitaMovimento = movimentoAll.filter((g) => secondaPartitaSet.has(g.id));
  const draftPool = movimentoAll.filter((g) => !secondaPartitaSet.has(g.id));

  const spaceInSquadra3 = sizes[2] - squadra3.length;
  const toSquadra3 = secondaPartitaMovimento.slice(0, Math.max(0, spaceInSquadra3));
  const overflowSeconda = secondaPartitaMovimento.slice(Math.max(0, spaceInSquadra3));

  toSquadra3.forEach((g) => squadra3.push(g));
  // Overflow seconda partita players go back to draft pool
  overflowSeconda.forEach((g) => draftPool.push(g));
  draftPool.sort((a, b) => b.livello - a.livello);

  // Serpentine draft remaining players
  serpentineDraft(draftPool, [squadra1, squadra2, squadra3], sizes);

  res.json({
    squadraA: { nome: "Squadra 1", giocatori: squadra1, livelleTotale: livelleTotale(squadra1) },
    squadraB: { nome: "Squadra 2", giocatori: squadra2, livelleTotale: livelleTotale(squadra2) },
    squadraC: { nome: "Squadra 3", giocatori: squadra3, livelleTotale: livelleTotale(squadra3) },
  });
});

export default router;
