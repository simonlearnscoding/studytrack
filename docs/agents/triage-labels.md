# Triage Labels

The skills speak in terms of five canonical triage roles. In this repo they are
applied as tags on issue notes in the ZenNotes vault.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the
corresponding label string from this table.

## Lifecycle statuses (vault `status` frontmatter)

Separate from triage roles: every note carries a `status` field, mirrored by any
`.base` databases.

| Status        | Meaning                           |
| ------------- | --------------------------------- |
| `todo`        | Not started                       |
| `in-progress` | Being worked on                   |
| `partial`     | Partially implemented             |
| `blocked`     | Waiting on a dependency           |
| `done`        | Implemented                       |
| `in-review`   | Customer is testing               |
| `tested`      | Verified by customer / UAT passed |
