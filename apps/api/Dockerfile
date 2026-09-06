FROM oven/bun:1.4.2-slim AS base
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

RUN bun install --filter api --production --frozen-lockfile 2>/dev/null || bun install --filter api

COPY apps/api ./apps/api
COPY packages/typescript-config ./packages/typescript-config

WORKDIR /app/apps/api
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["bun", "dist/index.js"]
