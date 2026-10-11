import { describe, expect, it } from 'vitest'
import type { LeaderboardRow } from '@studytrack/backend/convex/leaderboard/types'
import { buildLeaderboardEmbed, formatDurationShort } from './leaderboard'

const M = 60 * 1000
const H = 60 * 60 * 1000

const meta = { updatedAt: Date.UTC(2026, 5, 15, 10, 0, 0), timeZone: 'Europe/Zurich' }

function row(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    discordId: 'd1',
    name: 'Ada',
    deepFocusMs: 0,
    totalMs: 0,
    online: false,
    ...overrides,
  }
}

describe('buildLeaderboardEmbed', () => {
  it('shows an empty state when nobody has studied', () => {
    const embed = buildLeaderboardEmbed([], meta).toJSON()
    expect(embed.title).toBe("📚 Today's Study Leaderboard")
    expect(embed.description).toContain('No study time logged today yet.')
    expect(embed.footer?.text).toBe('studytrack • Europe/Zurich')
  })

  it('links to the dashboard from the title and a hard-to-miss line', () => {
    const withRows = buildLeaderboardEmbed([row()], meta).toJSON()
    const empty = buildLeaderboardEmbed([], meta).toJSON()

    expect(withRows.url).toBe('https://studytrack.simone-muscas.com/')
    expect(withRows.description).toContain(
      '**[📊 More details on the dashboard →](https://studytrack.simone-muscas.com/)**'
    )
    expect(empty.description).toContain('**[📊 More details on the dashboard →]')
  })

  it('renders a legend, medals, both figures and the online marker', () => {
    const embed = buildLeaderboardEmbed(
      [
        row({ name: 'Ada', deepFocusMs: H + 30 * M, totalMs: 3 * H, online: true }),
        row({ discordId: 'd2', name: 'Bob', deepFocusMs: 30 * M, totalMs: H }),
        row({ discordId: 'd3', name: 'Cara' }),
        row({ discordId: 'd4', name: 'Dan' }),
      ],
      meta
    ).toJSON()

    const description = embed.description ?? ''
    expect(description).toContain('🎥 Deep focus | Total')
    expect(description).toContain('🥇 **Ada** 🟢 — 🎥 1h30m | 3h00m')
    expect(description).toContain('🥈 **Bob** — 🎥 30m | 1h00m')
    expect(description).toContain('🥉 **Cara**')
    expect(description).toContain('4. **Dan**')
  })

  it('falls back to Unknown when a member has no name', () => {
    const embed = buildLeaderboardEmbed([row({ name: null })], meta).toJSON()
    expect(embed.description).toContain('**Unknown**')
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
