# syntax=docker/dockerfile:1

# The bot runs TypeScript directly via tsx, so one stage is enough. It holds the
# Discord gateway connection, so it must run as an always-on process.
FROM node:22-slim
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
CMD ["pnpm", "--filter", "@studytrack/bot", "start"]
