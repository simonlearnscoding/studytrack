import { describe, expect, it } from 'vitest'
import { parseZenQuote } from './util'

describe('parseZenQuote', () => {
  it('reads the quote and author from the one-element payload', () => {
    const payload = [
      {
        q: 'The greater the impact, the greater the influence.',
        a: 'Lolly Daskal',
        date: '2026-10-18',
      },
    ]
    expect(parseZenQuote(payload)).toEqual({
      text: 'The greater the impact, the greater the influence.',
      author: 'Lolly Daskal',
    })
  })

  it('trims surrounding whitespace', () => {
    expect(parseZenQuote([{ q: '  Move  ', a: '  Someone  ' }])).toEqual({
      text: 'Move',
      author: 'Someone',
    })
  })

  it('rejects empty, malformed, or non-array payloads', () => {
    expect(parseZenQuote([])).toBeNull()
    expect(parseZenQuote([{ q: 'No author' }])).toBeNull()
    expect(parseZenQuote([{ q: '', a: 'Someone' }])).toBeNull()
    expect(parseZenQuote([{ q: 42, a: 'Someone' }])).toBeNull()
    expect(parseZenQuote({ error: 'too many requests' })).toBeNull()
    expect(parseZenQuote(null)).toBeNull()
    expect(parseZenQuote('nope')).toBeNull()
  })
})
