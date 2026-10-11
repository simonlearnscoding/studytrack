# syntax=docker/dockerfile:1

# ---- build ----
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Install against the lockfile first for layer caching. The root manifests of
# every workspace package are needed for `--frozen-lockfile` to resolve.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .

# Vite inlines VITE_* into the client bundle at BUILD time — pass these as build
# args (Railway/Fly build args, or `--build-arg`).
ARG VITE_CONVEX_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SIGN_IN_URL
ARG VITE_CLERK_SIGN_UP_URL
ARG VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ARG VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
RUN pnpm --filter @studytrack/web build

# ---- runtime ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/web/.output ./apps/web/.output
EXPOSE 3000
CMD ["node", "apps/web/.output/server/index.mjs"]
