# syntax=docker/dockerfile:1

# ---- Base -------------------------------------------------------------------
# Alpine keeps the image small. `sharp` ships prebuilt musl binaries, so no
# toolchain is needed at install time.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- Dependencies -----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# The build needs dev dependencies; the runner gets a pruned tree further down.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build ------------------------------------------------------------------
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next needs these at build time to type-check the route tree. They are
# placeholders: every value that matters is read at runtime from the
# environment, never baked into the image.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
ENV ROOT_DOMAIN=example.com
ENV APP_URL=https://example.com
ENV S3_ENDPOINT=http://127.0.0.1:9000
ENV S3_BUCKET=build
ENV S3_ACCESS_KEY_ID=build
ENV S3_SECRET_ACCESS_KEY=build
ENV AUTH_SECRET=build-time-placeholder-secret-not-used

RUN pnpm build

# The migration runner is bundled into one self-contained file, so the runtime
# image needs no node_modules for it at all.
RUN pnpm build:migrate

# ---- Runner -----------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runs as an unprivileged user; the image contains nothing it may write to.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# The standalone bundle already carries the server and its traced dependencies.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Migrations run before the server starts: the SQL files and the bundled runner.
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/dist/migrate.mjs ./dist/migrate.mjs
COPY --chown=nextjs:nodejs docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000

# The health endpoint reports database and storage, so an unhealthy container
# is one that genuinely cannot serve.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
