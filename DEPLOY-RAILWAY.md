# Deploy su Railway

Il progetto è ora un **singolo servizio Docker**: Express serve sia le API (`/api/*`)
sia il frontend React buildato (tutto il resto), e i dati sono persistiti su
Postgres invece che su un file SQLite locale (che su Railway verrebbe perso ad
ogni redeploy).

## Passi

1. **Crea un nuovo progetto su Railway** e collega questo repository (Railway
   rileva automaticamente il `Dockerfile` alla radice — c'è anche un
   `railway.json` che configura build e healthcheck esplicitamente).
2. **Aggiungi un plugin Postgres** al progetto (`+ New` → `Database` →
   `PostgreSQL`).
3. **Imposta la variabile d'ambiente** sul servizio dell'app:
   - `DATABASE_URL` → referenzia quella del plugin Postgres (Railway te la
     propone in autocomplete, tipicamente `${{Postgres.DATABASE_URL}}`).
   - Non serve impostare `PORT`: lo inietta automaticamente Railway e il
     codice lo legge da `process.env.PORT`.
4. **Deploy.** Al primo avvio il server crea automaticamente tabella ed enum
   (`ensureDatabaseReady`, in `lib/db/src/index.ts`) e, se la tabella è
   vuota, inserisce 5 giocatori demo. Ai deploy successivi questo passo è
   no-op (idempotente).
5. **Healthcheck**: Railway userà `/api/healthz` (vedi `railway.json`).

## Cosa è cambiato rispetto alla versione Replit

- **Database**: da SQLite su file locale (`node:sqlite`, perso ad ogni
  redeploy) a Postgres via Drizzle ORM, usando lo scaffolding `lib/db` che
  era già nel repo ma non collegato a nulla.
- **Serving frontend**: l'Express server ora serve anche gli asset statici
  buildati di `artifacts/calcetto` (con fallback SPA per le route lato
  client), così basta un solo servizio Railway invece di doverne gestire due
  con CORS incrociato.
- **Dockerfile multi-stage**: build con pnpm in uno stage separato,
  immagine finale (`node:24-slim`) senza `node_modules` — esbuild ha già
  raggruppato (bundlato) tutte le dipendenze nel file `index.mjs`, quindi
  l'immagine di produzione è minima e veloce da deployare.
- Rimossa la dipendenza `better-sqlite3` (non più usata).
- Fix di un bug di compatibilità con Express 5: la wildcard route `app.get("*", ...)`
  non è più supportata da `path-to-regexp` v8 ed è stata sostituita con un
  middleware equivalente.

## Sviluppo locale

Resta tutto come prima (`replit.md`), con l'unica differenza che ora serve
davvero un Postgres locale (es. via Docker: `docker run -e
POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`) con `DATABASE_URL`
puntato lì:

```
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
pnpm --filter @workspace/api-server run dev
```
