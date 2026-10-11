import { Client, DiscordAPIError, EmbedBuilder, TextChannel } from 'discord.js'
import type { ConvexHttpClient } from 'convex/browser'
import { api } from '@studytrack/backend/convex/_generated/api'
import type { LeaderboardRow } from '@studytrack/backend/convex/leaderboard/types'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/sessions/util'

// The bot-owned leaderboard channel. Hardcoded for now (see ST-9): the board is
// the channel's only content, so it is cleared on every start.
export const LEADERBOARD_CHANNEL_ID = '916484382091513917'

const UPDATE_INTERVAL_MS = 60 * 1000
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
const ACCENT_COLOR = 0x5865f2
const MEDALS = ['🥇', '🥈', '🥉']
// Discord's own error code for a message that no longer exists.
const UNKNOWN_MESSAGE = 10008
// Where the full dashboard lives — the board links out to it.
const DASHBOARD_URL = 'https://studytrack.simone-muscas.com/'

// Pure: turn the ranked rows into the embed the channel shows.
export function buildLeaderboardEmbed(
  rows: LeaderboardRow[],
  meta: { updatedAt: number; timeZone: string }
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("📚 Today's Study Leaderboard")
    .setURL(DASHBOARD_URL)
    .setColor(ACCENT_COLOR)
    .setFooter({ text: `studytrack • ${meta.timeZone}` })
    .setTimestamp(meta.updatedAt)

  const body =
    rows.length === 0
      ? 'No study time logged today yet.'
      : [
          '🎥 Deep focus | Total',
          '',
          ...rows.map((row, index) => {
            const marker = MEDALS[index] ?? `${index + 1}.`
            const online = row.online ? ' 🟢' : ''
            const name = row.name ?? 'Unknown'
            return `${marker} **${name}**${online} — 🎥 ${formatDurationShort(row.deepFocusMs)} | ${formatDurationShort(row.totalMs)}`
          }),
        ].join('\n')

  return embed.setDescription(
    `${body}\n\n**[📊 More details on the dashboard →](${DASHBOARD_URL})**`
  )
}

// Durations in whole minutes only: a board that refreshes once a minute has no
// use for seconds (`3h07m42s` → `3h07m`).
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60000)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}m`
  return `${totalMinutes}m`
}

// On start: clear the bot-owned channel, post a fresh board, then keep editing
// that same message every minute. The message id lives only in memory — a restart
// clears and reposts (ST-9).
export async function startLeaderboard(
  client: Client,
  convex: ConvexHttpClient,
  secret: string
): Promise<void> {
  const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID)
  if (!(channel instanceof TextChannel)) {
    console.error(`[leaderboard] channel ${LEADERBOARD_CHANNEL_ID} is not a text channel`)
    return
  }

  await clearChannel(channel)

  const render = async () =>
    buildLeaderboardEmbed(await fetchRows(convex, secret), {
      updatedAt: Date.now(),
      timeZone: DASHBOARD_TIME_ZONE,
    })

  let message = await channel.send({ embeds: [await render()] })
  console.log(`[leaderboard] posted in #${channel.name}`)

  const update = async () => {
    try {
      await message.edit({ embeds: [await render()] })
    } catch (error) {
      // The message was deleted: repost so the board heals itself.
      if (error instanceof DiscordAPIError && error.code === UNKNOWN_MESSAGE) {
        message = await channel.send({ embeds: [await render()] })
        return
      }
      console.error('[leaderboard] update failed', error)
    }
  }

  setInterval(() => {
    void update()
  }, UPDATE_INTERVAL_MS)
}

async function fetchRows(convex: ConvexHttpClient, secret: string): Promise<LeaderboardRow[]> {
  const now = Date.now()
  return await convex.query(api.leaderboard.getToday, {
    secret,
    dayStart: startOfDay(now, DASHBOARD_TIME_ZONE),
    now,
  })
}

// The channel is bot-owned, so every message goes. Bulk delete cannot remove
// messages older than 14 days, so those are deleted one by one.
async function clearChannel(channel: TextChannel): Promise<void> {
  for (let pass = 0; pass < 20; pass++) {
    const batch = await channel.messages.fetch({ limit: 100 })
    if (batch.size === 0) return

    const cutoff = Date.now() - FOURTEEN_DAYS_MS
    const fresh = batch.filter((message) => message.createdTimestamp >= cutoff)
    const stale = batch.filter((message) => message.createdTimestamp < cutoff)

    if (fresh.size > 0) await channel.bulkDelete(fresh, true)
    for (const message of stale.values()) await message.delete()

    if (fresh.size === 0 && stale.size === 0) return
  }
}
