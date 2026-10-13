import { Client, DiscordAPIError, EmbedBuilder, TextChannel } from 'discord.js'
import type { ConvexHttpClient } from 'convex/browser'
import { api } from '@studytrack/backend/convex/_generated/api'
import type {
  LeaderboardBoards,
  LeaderboardRow,
} from '@studytrack/backend/convex/leaderboard/types'
import {
  DASHBOARD_TIME_ZONE,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@studytrack/backend/convex/sessions/util'

// The bot-owned leaderboard channel. Hardcoded for now (see ST-9): the board is
// the channel's only content, so it is cleared on every start.
export const LEADERBOARD_CHANNEL_ID = '916484382091513917'

const UPDATE_INTERVAL_MS = 60 * 1000
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
const MEDALS = ['🥇', '🥈', '🥉']
// Discord's own error code for a message that no longer exists.
const UNKNOWN_MESSAGE = 10008
// Where the full dashboard lives — every board title links out to it.
const DASHBOARD_URL = 'https://studytrack.simone-muscas.com/'

const TODAY_ACCENT = 0x5865f2
const WEEK_ACCENT = 0x57f287
const MONTH_ACCENT = 0xfee75c

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3))

export type LeaderboardMeta = {
  updatedAt: number
  timeZone: string
  weekStart: number
  monthStart: number
}

// Pure: turn the three ranked lists into the three embeds the channel shows, in
// order. Today carries the online marker and every title links to the dashboard;
// the dashboard line, footer and timestamp go only on the last embed.
export function buildLeaderboardEmbeds(
  boards: LeaderboardBoards,
  meta: LeaderboardMeta
): EmbedBuilder[] {
  return [
    boardEmbed({
      title: '📚 Today',
      accent: TODAY_ACCENT,
      rows: boards.today,
      empty: 'No study time logged today yet.',
      showOnline: true,
      meta,
      last: false,
    }),
    boardEmbed({
      title: `📅 This week · ${formatWeekLabel(meta.weekStart, meta.timeZone)}`,
      accent: WEEK_ACCENT,
      rows: boards.week,
      empty: 'No study time logged this week yet.',
      showOnline: false,
      meta,
      last: false,
    }),
    boardEmbed({
      title: `🗓️ ${formatMonthLabel(meta.monthStart, meta.timeZone)}`,
      accent: MONTH_ACCENT,
      rows: boards.month,
      empty: 'No study time logged this month yet.',
      showOnline: false,
      meta,
      last: true,
    }),
  ]
}

// A Week label like `13–19 Oct`, or `28 Sep–4 Oct` when the Week spans two months.
export function formatWeekLabel(weekStart: number, timeZone: string): string {
  const start = calendarParts(weekStart, timeZone)
  const endDate = new Date(Date.UTC(start.year, start.month - 1, start.day + 6))
  const endMonth = endDate.getUTCMonth() + 1
  const endDay = endDate.getUTCDate()
  if (start.month === endMonth) {
    return `${start.day}–${endDay} ${MONTHS_SHORT[start.month - 1]}`
  }
  return `${start.day} ${MONTHS_SHORT[start.month - 1]}–${endDay} ${MONTHS_SHORT[endMonth - 1]}`
}

// The Month's full name, e.g. `October`.
export function formatMonthLabel(monthStart: number, timeZone: string): string {
  return MONTHS[calendarParts(monthStart, timeZone).month - 1]
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

// On start: clear the bot-owned channel, post a fresh three-embed board, then
// keep editing that same message every minute. The message id lives only in
// memory — a restart clears and reposts (ST-9).
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

  const render = async (): Promise<EmbedBuilder[]> => {
    const now = Date.now()
    const dayStart = startOfDay(now, DASHBOARD_TIME_ZONE)
    const weekStart = startOfWeek(now, DASHBOARD_TIME_ZONE)
    const monthStart = startOfMonth(now, DASHBOARD_TIME_ZONE)
    const boards = await convex.query(api.leaderboard.getBoards, {
      secret,
      now,
      dayStart,
      weekStart,
      monthStart,
    })
    return buildLeaderboardEmbeds(boards, {
      updatedAt: now,
      timeZone: DASHBOARD_TIME_ZONE,
      weekStart,
      monthStart,
    })
  }

  let message = await channel.send({ embeds: await render() })
  console.log(`[leaderboard] posted in #${channel.name}`)

  const update = async () => {
    try {
      await message.edit({ embeds: await render() })
    } catch (error) {
      // The message was deleted: repost so the board heals itself.
      if (error instanceof DiscordAPIError && error.code === UNKNOWN_MESSAGE) {
        message = await channel.send({ embeds: await render() })
        return
      }
      console.error('[leaderboard] update failed', error)
    }
  }

  setInterval(() => {
    void update()
  }, UPDATE_INTERVAL_MS)
}

function boardEmbed(opts: {
  title: string
  accent: number
  rows: LeaderboardRow[]
  empty: string
  showOnline: boolean
  meta: LeaderboardMeta
  last: boolean
}): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(opts.title).setURL(DASHBOARD_URL).setColor(opts.accent)

  let description = opts.rows.length === 0 ? opts.empty : renderRows(opts.rows, opts.showOnline)
  if (opts.last) {
    description += `\n\n**[📊 More details on the dashboard →](${DASHBOARD_URL})**`
    embed
      .setFooter({ text: `studytrack • ${opts.meta.timeZone}` })
      .setTimestamp(opts.meta.updatedAt)
  }
  return embed.setDescription(description)
}

function renderRows(rows: LeaderboardRow[], showOnline: boolean): string {
  return [
    '🎥 Deep focus | Total',
    '',
    ...rows.map((row, index) => {
      const marker = MEDALS[index] ?? `${index + 1}.`
      const online = showOnline && row.online ? ' 🟢' : ''
      const name = row.name ?? 'Unknown'
      return `${marker} **${name}**${online} — 🎥 ${formatDurationShort(row.deepFocusMs)} | ${formatDurationShort(row.totalMs)}`
    }),
  ].join('\n')
}

// The local calendar date an instant falls on, in a named timezone.
function calendarParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
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
