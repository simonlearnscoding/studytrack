import { describe, expect, it } from 'vitest'
import type {
  LeaderboardBoards,
  LeaderboardRow,
} from '@studytrack/backend/convex/leaderboard/types'
import { buildLeaderboardEmbeds, formatDurationShort } from './leaderboard'

const M = 60 * 1000
const H = 60 * 60 * 1000

// Monday 2025-10-13 12:00 Zurich: the Week is 13–19 Oct, the Month is October.
const meta = {
  updatedAt: Date.UTC(2025, 9, 13, 10, 0, 0),
  timeZone: 'Europe/Zurich',
  weekStart: Date.UTC(2025, 9, 12, 22, 0, 0),
  monthStart: Date.UTC(2025, 8, 30, 22, 0, 0),
}

function row(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    discordId: 'd1',
    name: 'Ada',
    image: null,
    deepFocusMs: 0,
    totalMs: 0,
    online: false,
    ...overrides,
  }
}

function boards(overrides: Partial<LeaderboardBoards> = {}): LeaderboardBoards {
  return { today: [], day: [], week: [], month: [], ...overrides }
}

describe('buildLeaderboardEmbeds', () => {
  it('renders three boards in order with their titles', () => {
    const [today, week, month] = buildLeaderboardEmbeds(boards(), meta).map((e) => e.toJSON())
    expect(today.title).toBe('📚 Today')
    expect(week.title).toBe('📅 This week · 13–19 Oct')
    expect(month.title).toBe('🗓️ October')
    for (const embed of [today, week, month]) {
      expect(embed.url).toBe('https://studytrack.simone-muscas.com/')
    }
  })

  it('shows a per-board empty state', () => {
    const [today, week, month] = buildLeaderboardEmbeds(boards(), meta).map((e) => e.toJSON())
    expect(today.description).toContain('No study time logged today yet.')
    expect(week.description).toContain('No study time logged this week yet.')
    expect(month.description).toContain('No study time logged this month yet.')
  })

  it('renders a legend, medals and both figures on every board', () => {
    const rows = [
      row({ name: 'Ada', deepFocusMs: H + 30 * M, totalMs: 3 * H }),
      row({ discordId: 'd2', name: 'Bob', deepFocusMs: 30 * M, totalMs: H }),
      row({ discordId: 'd3', name: 'Cara' }),
      row({ discordId: 'd4', name: 'Dan' }),
    ]
    const embeds = buildLeaderboardEmbeds(
      boards({ today: rows, week: rows, month: rows }),
      meta
    ).map((e) => e.toJSON())
    for (const embed of embeds) {
      const description = embed.description ?? ''
      expect(description).toContain('🎥 Deep focus | Total')
      expect(description).toContain('🥇 **Ada** — 🎥 1h30m | 3h00m')
      expect(description).toContain('🥈 **Bob** — 🎥 30m | 1h00m')
      expect(description).toContain('🥉 **Cara**')
      expect(description).toContain('4. **Dan**')
    }
  })

  it('shows the online marker only on Today', () => {
    const online = [row({ online: true })]
    const [today, week] = buildLeaderboardEmbeds(boards({ today: online, week: online }), meta)
    expect(today.toJSON().description).toContain('🟢')
    expect(week.toJSON().description).not.toContain('🟢')
  })

  it('puts the dashboard line, footer and timestamp only on the last embed', () => {
    const [today, week, month] = buildLeaderboardEmbeds(boards({ today: [row()] }), meta).map((e) =>
      e.toJSON()
    )

    expect(today.description).not.toContain('More details on the dashboard')
    expect(week.description).not.toContain('More details on the dashboard')
    expect(month.description).toContain(
      '**[📊 More details on the dashboard →](https://studytrack.simone-muscas.com/)**'
    )

    expect(today.footer).toBeUndefined()
    expect(week.footer).toBeUndefined()
    expect(month.footer?.text).toBe('studytrack • Europe/Zurich')
    expect(month.timestamp).toBeDefined()
  })

  it('falls back to Unknown when a member has no name', () => {
    const [, , month] = buildLeaderboardEmbeds(boards({ month: [row({ name: null })] }), meta)
    expect(month.toJSON().description).toContain('**Unknown**')
  })
})

describe('formatDurationShort', () => {
  it('drops the seconds', () => {
    expect(formatDurationShort(3 * H + 30 * M + 5 * 1000)).toBe('3h30m')
  })

  it('shows whole minutes, truncating anything under a minute to 0m', () => {
    expect(formatDurationShort(45 * M + 12 * 1000)).toBe('45m')
    expect(formatDurationShort(5 * 1000)).toBe('0m')
    expect(formatDurationShort(0)).toBe('0m')
  })

  it('pads the minutes on a whole hour', () => {
    expect(formatDurationShort(2 * H)).toBe('2h00m')
  })
})
