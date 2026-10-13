---
name: deploy-server
description: Deploy or redeploy studytrack on the project's own server — the Convex production deployment, the Discord bot, and the web dashboard served through the existing Cloudflare tunnel at studytrack.simone-muscas.com. Use when deploying studytrack, when the dashboard or bot is down or stale and needs a redeploy, when adding or changing a public hostname or the tunnel route, or when the site 404s after a deploy. This is the self-hosted server path, not the Fly.io image path in docs/deploy.md.
compatibility: opencode
---

# Deploying studytrack to the server

Three pieces. Convex hosts itself and is deployed from your machine. The bot and
the web dashboard run as Docker containers on `simon@server`. The web is exposed
by the existing Cloudflare tunnel; the bot needs no route.

## The map (facts you cannot look up from the code)

- **Convex prod:** project `simon-muscas/studybot-backend`, deployment
  `dutiful-poodle-591`, URL `https://dutiful-poodle-591.eu-west-1.convex.cloud`.
- **Server:** `ssh simon@server`. NixOS; Docker works without sudo.
- **Deploy dir on the server:** `~/studytrack` — a copy of the working tree.
- **Prod secrets on the server:** `~/studytrack-bot.env`, `~/studytrack-web.env`
  (mode 600). These are the source of truth for prod.
- **Containers:** `studytrack-bot` (no ports) and `studytrack-web`
  (`127.0.0.1:3100` → container `3000`), both `--restart=always`.
- **Tunnel:** `studytrack.simone-muscas.com` → `http://localhost:3100`. The tunnel
  `simone-tunnel` (id `b02ec08a-126a-4fe1-acae-0dd7b690447e`) is **remotely
  managed from the Cloudflare dashboard/API**. `~/nixos/hosts/modules/server/cloudflared.nix`
  does NOT control it — editing that file changes nothing (it is a decoy; the
  running config reports `source: cloudflare`).
- **Clerk:** two instances. The **dev** instance keys live in `apps/web/.env` and
  serve local `pnpm dev`. The **prod** instance is `clerk.simone-muscas.com`; its
  `sk_live_…` lives in `~/studytrack-web.env` on the server, and its `pk_live_…` is
  passed to the web build (see step 2). Prod Convex trusts the prod issuer via
  `CLERK_JWT_ISSUER_DOMAIN`. All three must be the same instance, the `convex` JWT
  template must exist on it, and the site origin must be allowed in Clerk.

## Prerequisites

- `ssh simon@server` works non-interactively (key auth). If it only takes a
  password, run `ssh-copy-id simon@server` once. Never put the password in a file.
- Locally, `apps/web/.env` holds `VITE_CLERK_PUBLISHABLE_KEY` (public, baked into
  the build) and `apps/bot/.env` holds `DISCORD_TOKEN`. The deploy reads these.

## Steps

### 1. Convex — whenever the backend changed (the bot calls it too)

```bash
pnpm --filter @studytrack/backend deploy
```

Skip this after a backend change and the bot logs `Server Error` from its
leaderboard query (it calls `api.leaderboard.getBoards`) until you deploy. The
command pops a TTY confirmation; run it interactively (or through `script`).

It targets whatever `CONVEX_DEPLOYMENT` selects in
`packages/backend/.env.local` and prints that deployment's URL when done. That
value is **not** prod by default — check it first (prod is
`prod:dutiful-poodle-591`); a `CONVEX_DEPLOY_KEY` for the prod deployment, or
that `CONVEX_DEPLOYMENT` value, is what actually points the deploy at prod.
ST-11/ST-12 ship together: deploy the backend before the bot, because the new
bot calls `getBoards`, then run the one-off backfill:

````bash
npx convex run dailyTotals:backfill   # once, after the ST-11 deploy
``` The first time
(set, or when the values change):

```bash
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN <issuer>
npx convex env set --prod BOT_SHARED_SECRET <secret>
````

Convex refuses to deploy if `auth.config.ts` references an env var that is unset
on prod, so set these before the first deploy.

### 2. Server copy, images, restart

From the repo root:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc2ltb25lLW11c2Nhcy5jb20k \
  .agents/skills/deploy-server/scripts/deploy.sh
```

The override builds the web against the **prod** Clerk instance; without it the
script falls back to the dev `pk_test_` in `apps/web/.env`. It copies the working
tree to `~/studytrack`, builds both images, and restarts the containers. The
script is short — read it and run the commands by hand if you prefer.

### 3. Tunnel route — only when adding a hostname

Run on the server (idempotent):

```bash
ssh simon@server 'python3 -' < .agents/skills/deploy-server/scripts/ensure-tunnel-hostname.py
```

It reads the API token, account id and tunnel id from the credentials already on
the box (`~/.cloudflared/`) and adds
`studytrack.simone-muscas.com → http://localhost:3100` to the tunnel's remote
config. Defaults suit studytrack; pass `--hostname`/`--service` for others.

### 4. Clerk origin — once

Add `https://studytrack.simone-muscas.com` (plus the sign-in/up URLs) to Clerk's
allowed origins. If sign-in bounces, this is missing.

## Verify

- `curl -sI https://studytrack.simone-muscas.com/` → `200`.
- Fetch the HTML and confirm its `/assets/*.css` link returns `200`. A 404 there
  means the stylesheet bug below is back.
- `ssh simon@server 'docker logs studytrack-bot | tail -3'` → `studytrack bot
logged in as …` **and** `[leaderboard] posted in #…`. The stack above a fresh
  login is the pre-restart log.
- Join a study voice channel and watch a session appear on the dashboard.

## Gotchas (each cost real time)

- **The tunnel is dashboard-managed.** Routes live in the Cloudflare API, not in
  `~/nixos`. Change them with the script or the dashboard.
- **The web imports CSS as a side effect.** `apps/web/src/routes/__root.tsx`
  imports `~/styles/app.css` for its side effect, not as `?url`. The `?url` form
  makes TanStack Start emit a different CSS hash in the SSR build than the client
  build on Linux, so `HeadContent` links a CSS file that was never written and the
  page loads unstyled. Keep the side-effect import.
- **`VITE_*` are build-time.** Changing the Convex URL or the Clerk key needs a
  web image rebuild, not a container restart.
- **Two bots, one token.** Running the bot locally and on the server with the same
  Discord token makes Discord deliver voice events to only one of them. Run one.
- **Secrets stay out of git.** The server env files and the Convex prod env are
  the sources of truth; prod `BOT_SHARED_SECRET` must match between them.
- **Clerk instances are separate.** Local dev uses the dev instance (`pk_test_` in
  `apps/web/.env`, and dev Convex trusts its issuer); the server uses the prod
  instance `clerk.simone-muscas.com` (`pk_live_` / `sk_live_` in
  `~/studytrack-web.env`). Keep the three knobs on the same instance — web `pk`,
  Convex `CLERK_JWT_ISSUER_DOMAIN`, and the `convex` JWT template — or every
  Convex call 401s. Switching an instance changes every `identity.subject` and
  orphans the `users.clerkUserId` links.
- **Clerk's Cloudflare records must be DNS-only (grey).** Proxying the `clerk`
  CNAME makes Cloudflare answer error 1000 and clerk-js never loads, so the
  sign-in button does nothing. Even grey, the FAPI `403`s for a few minutes after
  a DNS change while Clerk activates the custom hostname — not a code problem.
