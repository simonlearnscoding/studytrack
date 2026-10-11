# Issue tracker: ZenNotes vault (local markdown)

Issues, specs and requirements for this repo live as markdown notes in the
ZenNotes vault at `docs/vault/`. Manage them with the ZenNotes MCP tools
(`zennotes_*`) or the `zennotes` CLI. Don't hand-edit the files (the vault keeps
its own metadata cache), and don't reach for a forge CLI — issues are local, so
`gh`/`glab` do not apply.

## Vault shape

- Vault root `docs/vault/`, root mode: inbox notes sit at the vault root.
- Feature/requirement areas are folders with a MOC ("map of content"), e.g.
  `Requirements/Requirements-moc.md`, listing their notes with status.
- Bugs live in `bugs/`; ideas in `quick/`; meetings in `Meetings/`.
- Areas grow lazily: create a folder and its MOC when a topic earns one.

## Issue note frontmatter

```yaml
# e.g. Requirements/session-lifecycle.md
id: ST-12 # <AREA>-<n>
status: todo # lifecycle, see triage-labels.md
type: requirement # requirement | bug | decision | concept
priority: B # A | B | C
area: requirements
```

## Conventions

- **Create**: `zennotes_create_note` (title + body, sensible `subpath`).
- **Read**: `zennotes_read_note` at the path returned by other tools; pass paths
  verbatim, never prepend `inbox/`.
- **Find**: `zennotes_list_notes`, `zennotes_search_text`,
  `zennotes_search_by_title`, `zennotes_search_by_tag`, `zennotes_list_tasks`.
- **Edit**: `zennotes_append_to_note`, `zennotes_replace_in_note`,
  `zennotes_write_note`.
- **Status**: the `status` frontmatter field, mirrored by any `.base` databases.
- **Discussion**: ZenNotes comment threads (`zennotes_add_comment` /
  `zennotes_reply_to_comment`), not body edits.

## When a skill says "publish to the issue tracker"

Create a note in the relevant area (or `bugs/`), give it the frontmatter above,
and link it from that area's MOC with `zennotes_append_to_note`.

## When a skill says "fetch the relevant ticket"

Read the referenced note with `zennotes_read_note`; the user normally passes the
path or the `id` (e.g. `ST-12`).

## Pull requests as a triage surface

**PRs as a request surface: no.** This repo's work lands as GitHub PRs, not as
inbound feature requests.

## Wayfinding operations

Used by `/wayfinder`. The **map** is the area MOC; its children are notes.

- **Map**: the area `*-moc.md` note.
- **Child ticket**: a requirement note in the area folder, carrying `type` and
  `status` frontmatter.
- **Blocking**: a `Blocked by: <id>` line in the note body.
- **Frontier**: open (`status: todo`), unblocked notes listed in the MOC.
- **Claim**: set `status: in-progress`.
- **Resolve**: append the answer, set `status: done`, tick the MOC entry.
