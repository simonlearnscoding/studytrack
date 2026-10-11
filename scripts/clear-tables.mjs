#!/usr/bin/env node
// Wipes every row from every table on the configured Convex deployment.
// Backed by the internal mutation `clear:clearAll` in packages/backend/convex.
// Dev only — never point this at production data you care about.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const result = spawnSync(
  'pnpm',
  ['--filter', '@studytrack/backend', 'exec', 'convex', 'run', 'clear:clearAll'],
  { cwd: root, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
