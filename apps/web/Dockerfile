FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare bun@1.4.2 --activate 2>/dev/null || npm i -g bun@1.4.2

COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/tokens/package.json ./packages/tokens/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

RUN bun install --filter web --frozen-lockfile 2>/dev/null || bun install --filter web

COPY apps/web ./apps/web
COPY packages ./packages
COPY turbo.json ./

WORKDIR /app/apps/web
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "start"]
