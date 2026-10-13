# Daily totals are stored, not recomputed

Every per-Day number is kept as one `dailyTotal` row per member and closed Day,
written by a cron and a one-off backfill, instead of being recomputed from raw
`sessionPartial` rows on each read. Readers (the weekly and monthly boards, and
later the heatmap and Streak) sum these rows.

The reason is cost and correctness at a longer range. The bot polls every minute
with a new `now`, so a raw read never caches; and a month of partials exceeds the
read cap, which would silently truncate. Rolling a Day up once also lets every
partial and session span be clipped to `[dayStart, dayEnd)`, so a session that
crosses midnight gives each Day only the minutes studied in it.

The rows are a derived cache, never the source of truth: the cron re-rolls the
last two closed Days so a late stale-session close corrects the numbers within
the hour, and `rollupDay` deletes then inserts, so re-running is idempotent.
Periods built on the rows are calendar-aligned (Monday weeks, 1st-of-month
months, Europe/Zurich) rather than trailing windows, because the reset is the
motivating moment and only a calendar Period can be named.
