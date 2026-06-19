import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// After build, the static frontend bundle (artifacts/calcetto's `vite build`
// output) is copied next to this bundled server as ./public — see the
// repo's Dockerfile. In dev this directory simply doesn't exist, and the
// static/SPA-fallback middlewares below are skipped.
const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_HTML = path.join(PUBLIC_DIR, "index.html");

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (existsSync(INDEX_HTML)) {
  app.use(express.static(PUBLIC_DIR));
  // SPA fallback: any other GET request that isn't an API call or a real
  // static asset gets the app shell, so client-side routing (wouter) works
  // on hard refreshes / deep links.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(INDEX_HTML);
  });
}

export default app;
