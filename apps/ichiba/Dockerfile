FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare bun@1.4.2 --activate 2>/dev/null || npm i -g bun@1.4.2

COPY package.json bun.lock turbo.json ./
COPY apps/ichiba/package.json ./apps/ichiba/
COPY packages/ui/package.json ./packages/ui/
COPY packages/tokens/package.json ./packages/tokens/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

RUN bun install --filter ichiba --frozen-lockfile 2>/dev/null || bun install --filter ichiba

COPY apps/ichiba ./apps/ichiba
COPY packages ./packages
COPY turbo.json ./

WORKDIR /app/apps/ichiba
# NEXT_PUBLIC_* is inlined at build time. Pass the test publishable key for
# local scale-lab builds; override with --build-arg for other envs.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2F1c2FsLXdlZXZpbC03MTQwLmNsZXJrLmFjY291bnRzLmRldiQ
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3003
EXPOSE 3003
CMD ["bun", "run", "start"]
