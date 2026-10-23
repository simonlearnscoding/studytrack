# The Focus view is the dashboard

The redesign that lived at `/beta` is now the dashboard at `/`. A signed-in
member lands in the Focus view; a signed-out visitor still sees the Welcome
page. The classic dashboard — its route components, its room panel and its own
task widget — is deleted, not kept behind a fallback. `/beta` redirects to `/`
for one release so old links keep working.

Two dashboards meant two sources of truth for the same Session, Task and room
reads. The old page already depended on the same
`sessions.getTodaysActivitiesForDashboard` query the Focus view reads, so
keeping it bought no independent safety: it only doubled the surface to
maintain and left the reader guessing which one was the product. The shared
visual primitives — the live dot, mode colours, the metric switch and the task
composer hint — stay, because the Focus view uses them too.

Considered and rejected:

- **Keep the classic dashboard at `/classic`.** It preserves a fallback, but a
  fallback nobody tests is worse than no fallback: it silently rots while
  looking authoritative.
- **Keep the Focus view at `/beta`.** The redesign is the product now; a status
  route makes the real page look temporary and keeps the old `/` ambiguous.
- **Switch per member behind a preference.** Two live paths for one page, for a
  migration that only needs to happen once.

Consequences: older notes and tickets that say `/beta` mean today's `/`; the
redirect is temporary and should be removed after one release. The Focus view now
lives under `components/dashboard/focus-view/`, and the classic dashboard's files
are gone.
