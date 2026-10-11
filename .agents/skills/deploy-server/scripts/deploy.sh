#!/usr/bin/env bash
# Copy the working tree to the server, rebuild both images there, restart the
# containers. Run from the repo root. See .agents/skills/deploy-server/SKILL.md.
set -euo pipefail

SERVER="${SERVER:-simon@server}"
REMOTE_DIR="${REMOTE_DIR:-studytrack}"
PROD_CONVEX_URL="${PROD_CONVEX_URL:-https://dutiful-poodle-591.eu-west-1.convex.cloud}"

# The Clerk publishable key is public and baked into the client bundle at build.
# It defaults to the local apps/web/.env (the dev instance); export
# VITE_CLERK_PUBLISHABLE_KEY=pk_live_... to build against the production instance.
PK="${VITE_CLERK_PUBLISHABLE_KEY:-$(grep '^VITE_CLERK_PUBLISHABLE_KEY=' apps/web/.env | cut -d= -f2-)}"
if [[ -z "$PK" ]]; then
  echo "VITE_CLERK_PUBLISHABLE_KEY not found (env or apps/web/.env)" >&2
  exit 1
fi

echo "==> copying working tree to $SERVER:~/$REMOTE_DIR"
tar czf - \
  --exclude=node_modules --exclude=.git --exclude=.output \
  --exclude='*/.output' --exclude=.convex --exclude=.tanstack \
  --exclude=dist --exclude=coverage --exclude=.zed . \
  | ssh "$SERVER" "rm -rf ~/$REMOTE_DIR && mkdir -p ~/$REMOTE_DIR && tar xzf - -C ~/$REMOTE_DIR"

echo "==> building images and restarting containers on the server"
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd ~/$REMOTE_DIR
docker build -f apps/bot/Dockerfile -t studytrack-bot .
docker build -f apps/web/Dockerfile \
  --build-arg VITE_CONVEX_URL=$PROD_CONVEX_URL \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=$PK \
  --build-arg VITE_CLERK_SIGN_IN_URL=/sign-in \
  --build-arg VITE_CLERK_SIGN_UP_URL=/sign-up \
  -t studytrack-web .
docker rm -f studytrack-bot studytrack-web >/dev/null 2>&1 || true
docker run -d --name studytrack-bot --restart=always --env-file ~/studytrack-bot.env studytrack-bot
docker run -d --name studytrack-web --restart=always --env-file ~/studytrack-web.env -p 127.0.0.1:3100:3000 studytrack-web
docker ps --filter name=studytrack --format '{{.Names}} | {{.Status}}'
REMOTE

echo "==> done. Verify:"
echo "    curl -sI https://studytrack.simone-muscas.com/"
echo "    ssh $SERVER 'docker logs studytrack-bot | tail -3'"
