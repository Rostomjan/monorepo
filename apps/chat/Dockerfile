FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare bun@1.4.2 --activate 2>/dev/null || npm i -g bun@1.4.2

COPY package.json bun.lock turbo.json ./
COPY apps/chat/package.json ./apps/chat/
COPY packages/ui/package.json ./packages/ui/
COPY packages/tokens/package.json ./packages/tokens/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

RUN bun install --filter chat --frozen-lockfile 2>/dev/null || bun install --filter chat

COPY apps/chat ./apps/chat
COPY packages ./packages
COPY turbo.json ./

WORKDIR /app/apps/chat
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "start"]
