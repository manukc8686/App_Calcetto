# syntax=docker/dockerfile:1

#############################################
# 1) deps — install the full pnpm workspace
#############################################
FROM node:24-slim AS deps
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig*.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/calcetto/package.json artifacts/calcetto/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/db/package.json lib/db/package.json
COPY scripts/package.json scripts/package.json

RUN pnpm install --frozen-lockfile

#############################################
# 2) build — build only what production needs:
#    the calcetto frontend bundle + the api-server bundle
#############################################
FROM deps AS build
WORKDIR /repo
COPY . .

# Dummy values: only needed to satisfy vite.config.ts during `vite build`,
# they have no effect on the production bundle's runtime behavior.
ENV PORT=4000
ENV BASE_PATH=/
ENV NODE_ENV=production

RUN pnpm --filter @workspace/calcetto run build
RUN pnpm --filter @workspace/api-server run build

# Bundle the built frontend assets alongside the api-server bundle so the
# single Express service can serve both (see artifacts/api-server/src/app.ts)
RUN mkdir -p artifacts/api-server/dist/public \
  && cp -r artifacts/calcetto/dist/public/. artifacts/api-server/dist/public/

#############################################
# 3) runtime — minimal image, no node_modules needed:
#    esbuild already bundled all dependencies into index.mjs
#############################################
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/artifacts/api-server/dist ./

EXPOSE 8080
CMD ["node", "--enable-source-maps", "index.mjs"]
