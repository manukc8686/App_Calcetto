import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, giocatori } from "../lib/db";
import { GeneraSquadreBody } from "@workspace/api-zod";

const router: IRouter = Router();

type Ruolo = "Attaccante" | "Difensore" | "Centrocampista" | "Portiere";

type GiocatoreConLivello = {
  id: number;
  nome: string;
  ruolo: Ruolo;
  rating: number;
  presenze: number;
  vittorie: number;
  livello: number;
};

type Squadra = {
  nome: string;
  giocatori: GiocatoreConLivello[];
  portiereATurno: boolean;
};

// Livello = (rating * 2.0) + ((vittorie / (presenze + 1)) * 5.0)
function calcolaLivello(rating: number, vittorie: number, presenze: number): number {
  return Math.round(((rating * 2.0) + ((vittorie / (presenze + 1)) * 5.0)) * 10) / 10;
}

function livelloTotale(sq: GiocatoreConLivello[]): number {
  return Math.round(sq.reduce((acc, g) => acc + g.livello, 0) * 10) / 10;
}

/**
 * Genera 3 squadre il più possibile bilanciate, a partire da un elenco di
 * giocatori già arricchiti con il loro `livello`.
 *
 * Regole:
 * - Portieri: solo i giocatori con ruolo Portiere possono giocare in porta.
 *   Se sono 3 (o più), uno a squadra (gli eventuali portieri in eccesso
 *   diventano giocatori di movimento). Se sono meno di 3, le squadre senza
 *   un portiere titolare vengono marcate `portiereATurno: true` (il ruolo
 *   verrà coperto a turno dai giocatori di movimento, o dal portiere della
 *   squadra che in quel momento riposa).
 * - Le squadre hanno lo stesso numero di giocatori di MOVIMENTO (a meno di
 *   un'unità quando il pool non è divisibile per 3), a prescindere da chi ha
 *   il portiere titolare: una squadra "a turno" non riceve un giocatore in
 *   più per compensare, perché il ruolo viene coperto dal portiere della
 *   squadra che in quel momento riposa. Di conseguenza una squadra "a
 *   turno" ha, nel suo elenco, una persona in meno rispetto alle altre.
 * - Ogni squadra ha, quando possibile, almeno un Attaccante e un Difensore.
 * - I giocatori indicati per la "seconda partita" vengono assegnati con
 *   priorità alla Squadra 3.
 * - Tutti i giocatori restanti vengono distribuiti uno alla volta,
 *   ordinati per livello decrescente, sempre alla squadra idonea con il
 *   livello totale più basso in quel momento: questo bilancia sia il numero
 *   di giocatori (si ferma quando una squadra raggiunge la sua quota) sia il
 *   livello complessivo.
 */
function generaSquadre(
  arricchiti: GiocatoreConLivello[],
  secondaPartitaIds: number[],
): Squadra[] {
  const portieri = [...arricchiti.filter((g) => g.ruolo === "Portiere")].sort((a, b) => b.livello - a.livello);
  const movimentoTutti = arricchiti.filter((g) => g.ruolo !== "Portiere");
  const secondaPartitaSet = new Set(secondaPartitaIds);

  const squadre: Squadra[] = [
    { nome: "Squadra 1", giocatori: [], portiereATurno: false },
    { nome: "Squadra 2", giocatori: [], portiereATurno: false },
    { nome: "Squadra 3", giocatori: [], portiereATurno: false },
  ];

  // 1) Portieri reali: uno a squadra, max 3. Gli eventuali portieri in più
  //    tornano nel pool dei giocatori di movimento.
  const numKeeperReali = Math.min(portieri.length, 3);
  for (let i = 0; i < numKeeperReali; i++) squadre[i].giocatori.push(portieri[i]);
  for (let i = 3; i < portieri.length; i++) movimentoTutti.push(portieri[i]);
  for (let i = numKeeperReali; i < 3; i++) squadre[i].portiereATurno = true;

  // 2) Target di giocatori di MOVIMENTO: uguale per tutte e tre le squadre, a
  //    prescindere da chi ha il portiere titolare. Chi non ce l'ha non
  //    riceve un giocatore di movimento in più per compensare: verrà coperto
  //    dal portiere della squadra che in quel momento riposa. L'eventuale
  //    resto (quando il pool di movimento non è divisibile per 3) va alla/e
  //    squadra/e con il livello più basso dopo l'assegnazione dei portieri.
  const movementPool = movimentoTutti.length;
  const baseMov = Math.floor(movementPool / 3);
  const remainderMov = movementPool % 3;
  const targetMovimento = [baseMov, baseMov, baseMov];
  const ordineResto = [0, 1, 2].sort(
    (a, b) => livelloTotale(squadre[a].giocatori) - livelloTotale(squadre[b].giocatori),
  );
  for (let i = 0; i < remainderMov; i++) targetMovimento[ordineResto[i]] += 1;

  const targetSize = [0, 1, 2].map((i) => targetMovimento[i] + squadre[i].giocatori.length);

  const assegnati = new Set<number>();
  function assegna(team: number, g: GiocatoreConLivello) {
    squadre[team].giocatori.push(g);
    assegnati.add(g.id);
  }
  function squadraConCapacita(predicate?: (i: number) => boolean): number {
    let best = -1;
    for (let i = 0; i < 3; i++) {
      if (squadre[i].giocatori.length >= targetSize[i]) continue;
      if (predicate && !predicate(i)) continue;
      if (best === -1 || livelloTotale(squadre[best].giocatori) > livelloTotale(squadre[i].giocatori)) best = i;
    }
    return best;
  }

  // 3) Preferenza "seconda partita": riempiono prioritariamente la Squadra 3,
  //    fino alla sua capacità. L'eventuale eccedenza torna nel pool generale.
  const secondaPartitaMovimento = movimentoTutti
    .filter((g) => secondaPartitaSet.has(g.id))
    .sort((a, b) => b.livello - a.livello);
  for (const g of secondaPartitaMovimento) {
    if (squadre[2].giocatori.length < targetSize[2]) assegna(2, g);
  }

  // 4) Copertura minima di ruolo: almeno 1 Attaccante e 1 Difensore a
  //    squadra (quando disponibili), sempre verso la squadra idonea più
  //    "leggera" per livello totale.
  for (const ruolo of ["Attaccante", "Difensore"] as const) {
    const pool = movimentoTutti
      .filter((g) => g.ruolo === ruolo && !assegnati.has(g.id))
      .sort((a, b) => b.livello - a.livello);
    for (const g of pool) {
      const team = squadraConCapacita((i) => !squadre[i].giocatori.some((x) => x.ruolo === ruolo));
      if (team === -1) break; // tutte le squadre idonee sono già coperte (o piene)
      assegna(team, g);
    }
  }

  // 5) Tutti i giocatori restanti, ordinati per livello decrescente,
  //    assegnati alla squadra idonea con il livello totale più basso.
  const restanti = movimentoTutti.filter((g) => !assegnati.has(g.id)).sort((a, b) => b.livello - a.livello);
  for (const g of restanti) {
    const team = squadraConCapacita();
    if (team === -1) break;
    assegna(team, g);
  }

  return squadre;
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

  const squadre = generaSquadre(arricchiti, secondaPartitaIds);

  const numAttaccanti = arricchiti.filter((g) => g.ruolo === "Attaccante").length;
  const numDifensori = arricchiti.filter((g) => g.ruolo === "Difensore").length;
  const warnings: string[] = [];
  if (numAttaccanti < 3) {
    warnings.push("Pochi attaccanti selezionati: non è stato possibile garantirne uno per ogni squadra.");
  }
  if (numDifensori < 3) {
    warnings.push("Pochi difensori selezionati: non è stato possibile garantirne uno per ogni squadra.");
  }

  res.json({
    squadraA: { nome: squadre[0].nome, giocatori: squadre[0].giocatori, livelloTotale: livelloTotale(squadre[0].giocatori), portiereATurno: squadre[0].portiereATurno },
    squadraB: { nome: squadre[1].nome, giocatori: squadre[1].giocatori, livelloTotale: livelloTotale(squadre[1].giocatori), portiereATurno: squadre[1].portiereATurno },
    squadraC: { nome: squadre[2].nome, giocatori: squadre[2].giocatori, livelloTotale: livelloTotale(squadre[2].giocatori), portiereATurno: squadre[2].portiereATurno },
    ...(warnings.length > 0 ? { warnings } : {}),
  });
});

export default router;
