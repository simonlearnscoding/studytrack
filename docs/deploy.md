# Deploying studytrack

Three pieces, three homes. Convex hosts itself; the web server and the bot ship
as Docker images (one each).

```
Convex (DB + functions)   managed — `convex deploy`
Web  (Nitro node server)  Docker image → always-on host
Bot  (discord.js gateway) Docker image → always-on host
```

## 1. Convex (do this first)

```bash
pnpm --filter @studytrack/backend deploy
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://<app>.clerk.accounts.dev
npx convex env set --prod BOT_SHARED_SECRET <long-random-string>
```

Note the production deployment URL it prints — the web `VITE_CONVEX_URL` and the
bot `CONVEX_URL` must both point at it. In CI, use a `CONVEX_DEPLOY_KEY` instead
of an interactive login.

## 2. Web image

Build args (baked in at build time — `VITE_*` is inlined into the client bundle):

```bash
docker build -f apps/web/Dockerfile \
  --build-arg VITE_CONVEX_URL=https://<prod>.convex.cloud \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx \
  --build-arg VITE_CLERK_SIGN_IN_URL=/sign-in \
  --build-arg VITE_CLERK_SIGN_UP_URL=/sign-up \
  -t studytrack-web .
docker run -p 3000:3000 -e CLERK_SECRET_KEY=sk_live_xxx studytrack-web
```

Serves on port 3000. Runtime env: `CLERK_SECRET_KEY`.

## 3. Bot image

```bash
docker build -f apps/bot/Dockerfile -t studytrack-bot .
docker run -e DISCORD_TOKEN=xxx \
  -e CONVEX_URL=https://<prod>.convex.cloud \
  -e BOT_SHARED_SECRET=<same value as Convex prod> \
  studytrack-bot
```

No ports, no healthcheck — it just holds the Discord gateway. Runtime env:
`DISCORD_TOKEN`, `CONVEX_URL`, `BOT_SHARED_SECRET`, optional `GUILD_ID`.

## Hosts

Both images are portable. Fastest options:

- **Fly.io** — `fly deploy` from the Dockerfile; best for the always-on bot.
  `fly launch --dockerfile apps/bot/Dockerfile` (same for web), then set secrets
  with `fly secrets set`.
- **Railway / Render** — connect the repo, one service per Dockerfile, set env
  vars in the dashboard. Git-push deploys.
- **Koyeb / Coolify / a VPS** — same images, same env.

Do **not** put the bot on a request-driven serverless host (Cloud Run, Lambda,
App Runner): Discord needs a persistent gateway connection.

## Checklist

- [ ] Convex deployed; prod `BOT_SHARED_SECRET` set.
- [ ] Web built with prod `VITE_CONVEX_URL` + live Clerk key.
- [ ] Clerk on a production instance, with the deployed domain allowed.
- [ ] Bot env `BOT_SHARED_SECRET` matches Convex prod.
- [ ] Dev watcher (`convex dev`) stopped before deploying.
